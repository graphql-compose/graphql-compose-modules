import {
  SchemaComposer,
  ObjectTypeComposer,
  upperFirst,
  ObjectTypeComposerFieldConfig,
  isOutputTypeDefinitionString,
  isWrappedTypeNameString,
  isComposeOutputType,
  isSomeOutputTypeDefinitionString,
  inspect,
} from 'graphql-compose';
import { AstResult, AstRootTypeNode, AstDirNode, AstFileNode } from './directoryToAst';
import dedent from 'dedent';
import { GraphQLObjectType } from 'graphql';

export interface AstToSchemaOptions {
  schemaComposer?: SchemaComposer<any>;
  prefix?: string;
  suffix?: string;
}

export function astToSchema<TContext = any>(
  ast: AstResult,
  opts: AstToSchemaOptions = {}
): SchemaComposer<TContext> {
  let sc: SchemaComposer<any>;

  if (opts?.schemaComposer) {
    if (!opts.schemaComposer) {
      throw new Error(dedent`
        Provided option 'schemaComposer' should be an instance of SchemaComposer class from 'graphql-compose' package. 
        Recieved:
          ${inspect(opts.schemaComposer)}
      `);
    }
    sc = opts.schemaComposer;
  } else {
    sc = new SchemaComposer();
  }

  if (ast.query) populateRoot(sc, 'Query', ast.query, opts);
  if (ast.mutation) populateRoot(sc, 'Mutation', ast.mutation, opts);
  if (ast.subscription) populateRoot(sc, 'Subscription', ast.subscription, opts);

  return sc;
}

function populateRoot(
  sc: SchemaComposer<any>,
  rootName: 'Query' | 'Mutation' | 'Subscription',
  astRootNode: AstRootTypeNode,
  opts?: AstToSchemaOptions
) {
  const tc = sc[rootName];
  Object.keys(astRootNode.children).forEach((key) => {
    createFields(sc, astRootNode.children[key], tc, rootName, opts || {});
  });
}

export function createFields(
  sc: SchemaComposer<any>,
  ast: AstDirNode | AstFileNode | void,
  parent: ObjectTypeComposer,
  pathPrefix: string,
  opts: AstToSchemaOptions = {}
): void {
  if (!ast) return;

  const name = ast.name;
  if (!/^[._a-zA-Z0-9]+$/.test(name)) {
    throw new Error(
      `You provide incorrect ${
        ast.kind === 'file' ? 'file' : 'directory'
      } name '${name}', it should meet RegExp(/^[._a-zA-Z0-9]+$/) for '${ast.absPath}'`
    );
  }

  if (ast.kind === 'file') {
    parent.addNestedFields({
      [name]: prepareFieldConfig(sc, ast),
    });
    return;
  }

  if (ast.kind === 'dir') {
    const typename = getTypename(ast, pathPrefix, opts);
    let fc: ObjectTypeComposerFieldConfig<any, any>;
    if (ast.namespaceConfig) {
      fc = prepareNamespaceFieldConfig(sc, ast.namespaceConfig, typename);
    } else {
      fc = { type: sc.createObjectTC(typename) };
    }

    parent.addNestedFields({
      [name]: {
        resolve: () => ({}),
        ...fc,
      },
    });

    const pathPrefixForChild = getTypename(ast, pathPrefix, {});
    Object.keys(ast.children).forEach((key) => {
      createFields(sc, ast.children[key], fc.type as any, pathPrefixForChild, opts);
    });
  }
}

function getTypename(
  ast: AstDirNode | AstFileNode,
  pathPrefix: string,
  opts: AstToSchemaOptions
): string {
  const name = ast.name;

  let typename = pathPrefix;
  if (name.indexOf('.') !== -1) {
    const namesArray = name.split('.');

    if (namesArray.some((n) => !n)) {
      throw new Error(
        `Field name '${ast.name}' contains dots in the wrong place for '${ast.absPath}'!`
      );
    }

    typename += namesArray.reduce((prev, current) => {
      return prev + upperFirst(current);
    }, '');
  } else {
    typename += upperFirst(name);
  }

  if (opts.prefix) typename = `${opts.prefix}${typename}`;
  if (opts.suffix) typename += opts.suffix;
  return typename;
}

function prepareNamespaceFieldConfig(
  sc: SchemaComposer<any>,
  ast: AstFileNode,
  typename: string
): ObjectTypeComposerFieldConfig<any, any> {
  if (!ast.code.default) {
    throw new Error(dedent`
      NamespaceModule MUST return FieldConfig as default export in '${ast.absPath}'. 
      Eg:
        export default {
          type: 'SomeObjectTypeName',
          resolve: () => Date.now(),
        };
    `);
  }

  const fc: any = ast.code.default;

  if (!fc.type) {
    fc.type = sc.createObjectTC(typename);
  } else {
    if (typeof fc.type === 'string') {
      if (!isOutputTypeDefinitionString(fc.type) && !isWrappedTypeNameString(fc.type)) {
        throw new Error(dedent`
          You provide incorrect output type definition:
            ${fc.type}
          It must be valid TypeName or output type SDL definition:
          
          Eg.
            type Payload { me: String }
          OR
            Payload
        `);
      }
    } else if (
      !(fc.type instanceof ObjectTypeComposer) &&
      !(fc.type instanceof GraphQLObjectType)
    ) {
      throw new Error(dedent`
        You provide some strange value as 'type':
          ${inspect(fc.type)}
      `);
    }
    fc.type = sc.createObjectTC(fc.type);
  }

  if (!fc.resolve) {
    fc.resolve = () => ({});
  }

  return fc;
}

function prepareFieldConfig(
  sc: SchemaComposer<any>,
  ast: AstFileNode
): ObjectTypeComposerFieldConfig<any, any> {
  const fc = ast.code.default as any;

  if (!fc) {
    throw new Error(dedent`
      Module MUST return FieldConfig as default export in '${ast.absPath}'. 
      Eg:
        export default {
          type: 'String',
          resolve: () => Date.now(),
        };
    `);
  }

  if (!fc.type || !isSomeOutputTypeDefinition(fc.type)) {
    throw new Error(dedent`
      Module MUST return FieldConfig with correct 'type: xxx' property in '${ast.absPath}'. 
      Eg:
        export default {
          type: 'String'
        };
    `);
  }

  return fc;
}

function isSomeOutputTypeDefinition(type: any): boolean {
  if (typeof type === 'string') {
    // type: 'String'
    return isSomeOutputTypeDefinitionString(type) || isWrappedTypeNameString(type);
  } else if (Array.isArray(type)) {
    // type: ['String']
    return isSomeOutputTypeDefinition(type[0]);
  } else {
    // type: 'type User { name: String }'
    return isComposeOutputType(type);
  }
}
