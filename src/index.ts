import { directoryToAst, DirectoryToAstOptions } from './directoryToAst';
import { astToSchema, AstToSchemaOptions } from './astToSchema';

export interface BuildOptions extends DirectoryToAstOptions, AstToSchemaOptions {}

export function buildSchema(module: NodeModule, opts: BuildOptions = {}) {
  return loadSchemaComposer(module, opts).buildSchema();
}

export function loadSchemaComposer(module: NodeModule, opts: BuildOptions) {
  const ast = directoryToAst(module, opts);
  const sc = astToSchema(ast, opts);
  return sc;
}

export {
  directoryToAst,
  DirectoryToAstOptions,
  AstNodeKinds,
  AstBaseNode,
  AstRootTypeNode,
  AstDirNode,
  AstFileNode,
  AstRootNode,
} from './directoryToAst';
export { astToSchema, AstToSchemaOptions } from './astToSchema';
export * from './testHelpers';
