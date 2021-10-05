import {
  AstRootTypeNode,
  AstDirNode,
  AstFileNode,
  AstRootNode,
  RootTypeNames,
} from './directoryToAst';

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
  /** Information about `node` obtained in `directoryToAst()` */
  node: NodeKind,
  /** Information from visitor during traversing AST tree */
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

export interface VisitInfo {
  /** Brunch of schema under which is working visitor. Can be: query, mutation, subscription */
  operation: RootTypeNames;
  /** Parent AST node from directoryToAst */
  parent: AstDirNode | AstRootTypeNode | AstRootNode;
  /** Name of field for current FieldConfig */
  name: string;
  /** List of parent names starting from root */
  path: string[];
}

/**
 * Traverse AST for applying modifications to DIRs, FILEs & ROOT_TYPEs
 * Useful for writing middlewares which transform FieldConfigs entrypoints.
 *
 * @example
 *   const ast = directoryToAst(module);
 *   astVisitor(ast, {
 *     ROOT_TYPE: () => {}, // run for query, mutation, subscription
 *     DIR: () => {}, // executes on visiting DIR node
 *     FILE: () => {}, // executes on visiting FILE node
 *   });
 */
export function astVisitor(ast: AstRootNode, visitor: AstVisitor): void {
  (Object.keys(ast.children) as Array<keyof typeof ast.children>).forEach((operation) => {
    const rootNode = ast.children[operation];
    if (!rootNode) return;

    visitNode(rootNode, visitor, {
      parent: ast,
      name: operation,
      path: [],
      operation,
    });
  });
}

export function visitNode(
  node: AstDirNode | AstFileNode | AstRootTypeNode,
  visitor: AstVisitor,
  info: VisitInfo
): void {
  let result: VisitorEmptyResult | AstDirNode | AstFileNode | AstRootTypeNode;
  if (node.kind === 'dir') {
    if (visitor.DIR) result = visitor.DIR(node, info);
  } else if (node.kind === 'file') {
    if (visitor.FILE) result = visitor.FILE(node, info);
  } else if (node.kind === 'rootType') {
    if (visitor.ROOT_TYPE) result = visitor.ROOT_TYPE(node, info);
  }

  if (result === VISITOR_REMOVE_NODE) {
    // `null` - means remove node from Ast and do not traverse children
    delete (info.parent.children as any)[info.name];
    return;
  } else if (result === VISITOR_SKIP_CHILDREN) {
    // `false` - do not traverse children
    return;
  } else if (result) {
    // replace node
    (info.parent.children as any)[info.name] = result;
  } else {
    // `undefined` - just move further
    result = node;
  }

  if (result.kind === 'dir' || result.kind === 'rootType') {
    forEachKey(result.children, (childNode: AstDirNode | AstFileNode, name) => {
      visitNode(childNode, visitor, {
        parent: result as AstDirNode,
        name,
        path: [...info.path, info.name],
        operation: info.operation,
      });
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
