import {
  SchemaComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMapDefinition,
  upperFirst,
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
  ast: RequireAstRootTypeNode
) {
  const tc = sc[rootName];
  const fields = createFields(ast, rootName);
  tc.addNestedFields(fields);
}

function createFields(
  ast: RequireAstDirNode | RequireAstRootTypeNode,
  suffix: string
): ObjectTypeComposerFieldConfigMapDefinition<any, any> {
  const fields = {};

  Object.keys(ast.children).forEach((fieldName) => {
    const node = ast.children[fieldName];
    if (node.kind === 'dir') {
    }
    fields[fieldName] = '';
  });

  return fields;
}
