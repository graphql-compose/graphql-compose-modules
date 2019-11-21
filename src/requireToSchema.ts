import {
  SchemaComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMapDefinition,
  upperFirst,
  forEachKey,
  schemaComposer,
} from 'graphql-compose';
import {
  RequireAstResult,
  RequireAstRootTypeNode,
  RequireAstDirNode,
  RequireAstFileNode,
} from './requireSchemaDirectory';

export function requireToSchema<TContext = any>(ast: RequireAstResult): SchemaComposer<TContext> {
  const sc = new SchemaComposer<TContext>();

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
    createFields(astRootNode.children[key], rootName, tc);
  });
}

function createFields(
  ast: RequireAstDirNode | RequireAstFileNode,
  suffix: string,
  parent: ObjectTypeComposer
) {
  if (ast.kind === 'file') {
    if (ast.name !== 'index') {
      if (!ast.code.default) throw new Error('File must return field config by default export');

      parent.addNestedFields({
        [ast.name]: ast.code.default,
      });
    }
  } else if (ast.kind === 'dir') {
    let name = ast.name;
    let typeDefs: any = {};

    if (name.indexOf('.') !== -1) {
      const namesArray = name.split('.');

      if (namesArray.length === 1) {
        name = namesArray[0];
      } else {
        name = namesArray.reduce((finalName, current) => {
          return finalName + upperFirst(current);
        }, '');
      }
    }

    if (ast.children['index'] && ast.children['index'].kind === 'file') {
      typeDefs = ast.children['index'].code.default || {};
    }

    if (typeDefs.type) {
      if (typeof typeDefs.type === 'string') {
        typeDefs.type = schemaComposer.createObjectTC(typeDefs.type);
      }
    } else {
      typeDefs.type = schemaComposer.createObjectTC(`${suffix}${upperFirst(name)}`);
    }

    Object.keys(ast.children).forEach((key) => {
      createFields(ast.children[key], name, typeDefs.type);
    });

    parent.addNestedFields({
      [ast.name]: {
        resolve: () => ({}),
        ...typeDefs,
      },
    });
  }
}
