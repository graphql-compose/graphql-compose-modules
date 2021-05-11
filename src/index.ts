import { directoryToAst, DirectoryToAstOptions } from './directoryToAst';
import { astToSchema, AstToSchemaOptions } from './astToSchema';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLSchema } from 'graphql';

export interface BuildOptions extends DirectoryToAstOptions, AstToSchemaOptions {}

export function buildSchema(module: NodeModule, opts: BuildOptions = {}): GraphQLSchema {
  return loadSchemaComposer(module, opts).buildSchema();
}

export function loadSchemaComposer<TContext = any>(
  module: NodeModule,
  opts: BuildOptions
): SchemaComposer<TContext> {
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
export * from './typeDefs';

export {
  astVisitor,
  VISITOR_REMOVE_NODE,
  VISITOR_SKIP_CHILDREN,
  AstVisitor,
  VisitInfo,
} from './astVisitor';

export { astMerge } from './astMerge';
