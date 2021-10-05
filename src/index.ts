import { directoryToAst, DirectoryToAstOptions } from './directoryToAst';
import { astToSchema, AstToSchemaOptions } from './astToSchema';
import { SchemaComposer } from 'graphql-compose';
import { GraphQLSchema } from 'graphql';

export interface BuildOptions extends DirectoryToAstOptions, AstToSchemaOptions {}

/**
 * Traverses directories and return GraphQLSchema instance from `graphql-js`.
 *
 * @param m – is a NodeJS Module which provides a way to load modules from scanned dir in the regular nodejs way
 * @param options – set of options which helps to customize rules of what files/dirs should be loaded or not
 */
export function buildSchema(module: NodeModule, opts: BuildOptions = {}): GraphQLSchema {
  return loadSchemaComposer(module, opts).buildSchema();
}

/**
 * Traverses directories and return SchemaComposer instance from `graphql-compose`.
 *
 * @param m – is a NodeJS Module which provides a way to load modules from scanned dir in the regular nodejs way
 * @param options – set of options which helps to customize rules of what files/dirs should be loaded or not
 */
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
