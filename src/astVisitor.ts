import { SchemaComposer } from 'graphql-compose';
import { AstRootTypeNode, AstDirNode, AstFileNode, AstRootNode } from './directoryToAst';
import { VisitInfo } from './VisitInfo';

/**
 * Do not traverse children, and go to next sibling.
 */
export const VISITOR_SKIP_CHILDREN = false;

/**
 * Remove Node from AST and do not traverse children.
 */
export const VISITOR_REMOVE_NODE = null;

export type VisitorEmptyResult =
  | void // just move further
  | typeof VISITOR_REMOVE_NODE
  | typeof VISITOR_SKIP_CHILDREN;

export type VisitKindFn<NodeKind> = (
  /** Info & helper functions from visitor during traversing AST tree */
  info: VisitInfo
) => VisitorEmptyResult | NodeKind;

/**
 * Functions for every type of AST nodes which will be called by visitor.
 */
export type AstVisitor = {
  DIR?: VisitKindFn<AstDirNode>;
  FILE?: VisitKindFn<AstFileNode>;
  ROOT_TYPE?: VisitKindFn<AstRootTypeNode>;
};

/**
 * Traverse AST for applying modifications to DIRs, FILEs & ROOT_TYPEs
 * Useful for writing middlewares which transform FieldConfigs entrypoints.
 *
 * @example
 *   const ast = directoryToAst(module);
 *   astVisitor(ast, schemaComposer, {
 *     ROOT_TYPE: () => {}, // run for query, mutation, subscription
 *     DIR: () => {}, // executes on visiting DIR node
 *     FILE: () => {}, // executes on visiting FILE node
 *   });
 */
export function astVisitor(
  ast: AstRootNode,
  schemaComposer: SchemaComposer<any>,
  visitor: AstVisitor
): void {
  (Object.keys(ast.children) as Array<keyof typeof ast.children>).forEach((operation) => {
    const node = ast.children[operation];
    if (!node) return;

    visitNode(
      new VisitInfo({
        node,
        nodeParent: ast,
        fieldName: operation,
        fieldPath: [],
        operation,
        schemaComposer,
      }),
      visitor
    );
  });
}

export function visitNode(info: VisitInfo, visitor: AstVisitor): void {
  let result: VisitorEmptyResult | AstDirNode | AstFileNode | AstRootTypeNode;
  if (info.node.kind === 'dir') {
    if (visitor.DIR) result = visitor.DIR(info);
  } else if (info.node.kind === 'file') {
    if (visitor.FILE) result = visitor.FILE(info);
  } else if (info.node.kind === 'rootType') {
    if (visitor.ROOT_TYPE) result = visitor.ROOT_TYPE(info);
  }

  if (result === VISITOR_REMOVE_NODE) {
    // `null` - means remove node from Ast and do not traverse children
    delete (info.nodeParent.children as any)[info.fieldName];
    return;
  } else if (result === VISITOR_SKIP_CHILDREN) {
    // `false` - do not traverse children
    return;
  } else if (result) {
    // replace node
    (info.nodeParent.children as any)[info.fieldName] = result;
  } else {
    // `undefined` - just move further
    result = info.node;
  }

  if (result.kind === 'dir' || result.kind === 'rootType') {
    forEachKey(result.children, (childNode: AstDirNode | AstFileNode, fieldName) => {
      visitNode(
        new VisitInfo({
          node: childNode,
          nodeParent: result as AstDirNode,
          fieldName,
          fieldPath: [...info.fieldPath, info.fieldName],
          operation: info.operation,
          schemaComposer: info.schemaComposer,
        }),
        visitor
      );
    });
  }
}

export function forEachKey<V>(
  obj: Record<string, V>,
  callback: (value: V, key: string) => void
): void {
  Object.keys(obj).forEach((key) => {
    callback(obj[key], key);
  });
}
