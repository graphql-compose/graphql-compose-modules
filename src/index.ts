import { requireSchemaDirectory, RequireOptions } from './requireSchemaDirectory';
import { requireAstToSchema, AstOptions } from './requireAstToSchema';

export interface BuildOptions extends RequireOptions, AstOptions {}

export function buildSchema(module: NodeModule, opts: BuildOptions = {}) {
  return loadSchemaComposer(module, opts).buildSchema();
}

export function loadSchemaComposer(module: NodeModule, opts: BuildOptions) {
  const ast = requireSchemaDirectory(module, opts);
  const sc = requireAstToSchema(ast, opts);
  return sc;
}

export { requireSchemaDirectory, requireAstToSchema };
