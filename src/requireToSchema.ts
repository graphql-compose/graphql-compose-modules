import {
  SchemaComposer,
  ObjectTypeComposer,
  upperFirst,
  schemaComposer,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
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

function getTypeDefFromIndexFile(
  ast: RequireAstFileNode,
  suffix: string,
  name: string
): ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> {
  const typeDefs: any = ast.code.default || {};

  if (typeDefs.type) {
    if (typeof typeDefs.type === 'string') {
      typeDefs.type = schemaComposer.createObjectTC(typeDefs.type);
    }
  } else {
    typeDefs.type = schemaComposer.createObjectTC(`${suffix}${upperFirst(name)}`);
  }

  return typeDefs;
}

function createFields(
  ast: RequireAstDirNode | RequireAstFileNode,
  suffix: string,
  parent: ObjectTypeComposer
) {
  let name = ast.name.trim();

  if (name.length !== ast.name.length)
    throw new Error(`Field ${ast.name} from ${ast.absPath} contain spaces at the edges!`);

  let nestedFieldName = name;

  if (name.indexOf('.') !== -1) {
    const namesArray = name.split('.');
    const clearName = [];

    namesArray.forEach((name) => {
      if (name) clearName.push(name);
    });

    if (clearName.length !== namesArray.length)
      throw new Error(`Field ${ast.name} from ${ast.absPath} contains dots in the wrong place!`);

    nestedFieldName = clearName.join('.');

    name = clearName.reduce((finalName, current) => {
      return finalName + upperFirst(current);
    }, '');
  }

  if (ast.kind === 'file') {
    if (nestedFieldName !== 'index') {
      if (!ast.code.default) throw new Error('File must return field config by default export');

      if (!nestedFieldName.endsWith('.index')) {
        parent.addNestedFields({
          [nestedFieldName]: ast.code.default,
        });
      } else {
        const nestedIndexFieldName = nestedFieldName.slice(0, -6); // remove ".index" from field name
        const indexTypeDef = getTypeDefFromIndexFile(ast, suffix, name);
        if (!indexTypeDef.resolve) indexTypeDef.resolve = () => ({});
        parent.addNestedFields({
          [nestedIndexFieldName]: indexTypeDef,
        });
      }
    }
  } else if (ast.kind === 'dir') {
    let typeDefs: any = {};

    if (ast.children['index'] && ast.children['index'].kind === 'file') {
      typeDefs = getTypeDefFromIndexFile(ast.children['index'], suffix, name);
    } else {
      typeDefs.type = schemaComposer.createObjectTC(`${suffix}${upperFirst(name)}`);
    }

    const extendResolveResponseFields = typeDefs.resolve ? Object.keys(ast.children) : [];

    Object.keys(ast.children).forEach((key) => {
      createFields(ast.children[key], name, typeDefs.type);
    });

    if (extendResolveResponseFields.length) {
      const oldResolve = typeDefs.resolve;
      typeDefs.resolve = async (...args) => {
        const response = await oldResolve(...args);
        extendResolveResponseFields.forEach((key) => {
          response[key] = {};
        });
        return response;
      };
    }

    parent.addNestedFields({
      [nestedFieldName]: {
        resolve: () => ({}),
        ...typeDefs,
      },
    });
  }
}
