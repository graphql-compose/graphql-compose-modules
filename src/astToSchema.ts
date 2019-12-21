import {
  SchemaComposer,
  ObjectTypeComposer,
  upperFirst,
  ObjectTypeComposerFieldConfig,
  isOutputTypeDefinitionString,
  isTypeNameString,
  isComposeOutputType,
  isSomeOutputTypeDefinitionString,
  inspect,
} from 'graphql-compose';
import { AstResult, AstRootTypeNode, AstDirNode, AstFileNode } from './directoryToAst';
import dedent from 'dedent';
import { GraphQLObjectType } from 'graphql';

export interface AstOptions {
  schemaComposer?: SchemaComposer<any>;
}

export function astToSchema<TContext = any>(
  ast: AstResult,
  opts: AstOptions = {}
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

  if (ast.query) populateRoot(sc, 'Query', ast.query);
  if (ast.mutation) populateRoot(sc, 'Mutation', ast.mutation);
  if (ast.subscription) populateRoot(sc, 'Subscription', ast.subscription);

  return sc;
}

function populateRoot(
  sc: SchemaComposer<any>,
  rootName: 'Query' | 'Mutation' | 'Subscription',
  astRootNode: AstRootTypeNode
) {
  const tc = sc[rootName];
  Object.keys(astRootNode.children).forEach((key) => {
    createFields(sc, astRootNode.children[key], rootName, tc);
  });
}

export function createFields(
  sc: SchemaComposer<any>,
  ast: AstDirNode | AstFileNode | void,
  prefix: string,
  parent: ObjectTypeComposer
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
    if (name !== 'index') {
      if (name.endsWith('.index')) {
        const fieldName = name.slice(0, -6); // remove ".index" from field name
        parent.addNestedFields({
          [fieldName]: prepareNamespaceFieldConfig(sc, ast, `${prefix}${getTypename(ast)}`),
        });
      } else {
        parent.addNestedFields({
          [name]: prepareFieldConfig(sc, ast),
        });
      }
    }
    return;
  }

  if (ast.kind === 'dir') {
    const typename = `${prefix}${getTypename(ast)}`;
    let fc: ObjectTypeComposerFieldConfig<any, any>;
    if (ast.children['index'] && ast.children['index'].kind === 'file') {
      fc = prepareNamespaceFieldConfig(sc, ast.children['index'], typename);
    } else {
      fc = { type: sc.createObjectTC(typename) };
    }

    parent.addNestedFields({
      [name]: {
        resolve: () => ({}),
        ...fc,
      },
    });

    Object.keys(ast.children).forEach((key) => {
      createFields(sc, ast.children[key], typename, fc.type as any);
    });
  }
}

function getTypename(ast: AstDirNode | AstFileNode): string {
  const name = ast.name;

  if (name.indexOf('.') !== -1) {
    const namesArray = name.split('.');

    if (namesArray.some((n) => !n)) {
      throw new Error(
        `Field name '${ast.name}' contains dots in the wrong place for '${ast.absPath}'!`
      );
    }

    return namesArray.reduce((prev, current) => {
      return prev + upperFirst(current);
    }, '');
  } else {
    return upperFirst(name);
  }
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
      if (!isOutputTypeDefinitionString(fc.type) && !isTypeNameString(fc.type)) {
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
    return isSomeOutputTypeDefinitionString(type) || isTypeNameString(type);
  } else if (Array.isArray(type)) {
    // type: ['String']
    return isSomeOutputTypeDefinition(type[0]);
  } else {
    // type: 'type User { name: String }'
    return isComposeOutputType(type);
  }
}
