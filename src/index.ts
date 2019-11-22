import { requireSchemaDirectory } from './requireSchemaDirectory';
import { requireAstToSchema } from './requireAstToSchema';

export function buildSchema(module: NodeModule) {
  return loadSchemaComposer(module).buildSchema();
}

export function loadSchemaComposer(module: NodeModule) {
  const ast = requireSchemaDirectory(module);
  const sc = requireAstToSchema(ast);
  return sc;
}

export { requireSchemaDirectory, requireAstToSchema };
