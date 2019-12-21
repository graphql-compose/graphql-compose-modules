import { directoryToAst, Options } from './directoryToAst';
import { astToSchema, AstOptions } from './astToSchema';

export interface BuildOptions extends Options, AstOptions {}

export function buildSchema(module: NodeModule, opts: BuildOptions = {}) {
  return loadSchemaComposer(module, opts).buildSchema();
}

export function loadSchemaComposer(module: NodeModule, opts: BuildOptions) {
  const ast = directoryToAst(module, opts);
  const sc = astToSchema(ast, opts);
  return sc;
}

export { directoryToAst, astToSchema };
