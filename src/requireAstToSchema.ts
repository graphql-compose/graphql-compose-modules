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
import {
  RequireAstResult,
  RequireAstRootTypeNode,
  RequireAstDirNode,
  RequireAstFileNode,
} from './requireSchemaDirectory';
import dedent from 'dedent';
import { GraphQLObjectType } from 'graphql';

export function requireAstToSchema<TContext = any>(
  ast: RequireAstResult,
  schemaComposer?: SchemaComposer<TContext>
): SchemaComposer<TContext> {
  const sc = schemaComposer || new SchemaComposer<TContext>();

  if (ast.query) populateRoot(sc, 'Query', ast.query);
  if (ast.mutation) populateRoot(sc, 'Mutation', ast.mutation);
  if (ast.subscription) populateRoot(sc, 'Subscription', ast.subscription);

  return sc;
}

function populateRoot(
  sc: SchemaComposer<any>,
  rootName: 'Query' | 'Mutation' | 'Subscription',
  astRootNode: RequireAstRootTypeNode
) {
  const tc = sc[rootName];
  Object.keys(astRootNode.children).forEach((key) => {
    createFields(sc, astRootNode.children[key], rootName, tc);
  });
}

function createFields(
  sc: SchemaComposer<any>,
  ast: RequireAstDirNode | RequireAstFileNode,
  prefix: string,
  parent: ObjectTypeComposer
): void {
  const name = ast.name;
  if (!/^[._a-zA-Z0-9]+$/.test(name)) {
    throw new Error(
      `You provide incorrect ${
        ast.kind === 'file' ? 'file' : 'directory'
      } name '${name}', it should meet RegExp(/^[._a-zA-Z0-9]+$/) for '${ast.absPath}'`
    );
  }
  const typename = getTypename(ast);

  if (ast.kind === 'file') {
    if (name !== 'index') {
      if (name.endsWith('.index')) {
        const fieldName = name.slice(0, -6); // remove ".index" from field name
        parent.addNestedFields({
          [fieldName]: prepareNamespaceFieldConfig(sc, ast, prefix, typename),
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
    let fc: ObjectTypeComposerFieldConfig<any, any>;
    if (ast.children['index'] && ast.children['index'].kind === 'file') {
      fc = prepareNamespaceFieldConfig(sc, ast.children['index'], prefix, typename);
    } else {
      fc = { type: sc.createObjectTC(`${prefix}${typename}`) };
    }

    parent.addNestedFields({
      [name]: {
        resolve: () => ({}),
        ...fc,
      },
    });

    Object.keys(ast.children).forEach((key) => {
      createFields(sc, ast.children[key], name, fc.type as any);
    });
  }
}

function getTypename(ast: RequireAstDirNode | RequireAstFileNode): string {
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
  ast: RequireAstFileNode,
  prefix: string,
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
    fc.type = sc.createObjectTC(`${prefix}${typename}`);
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
  ast: RequireAstFileNode
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
