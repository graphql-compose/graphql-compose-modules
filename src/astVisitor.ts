import { AstRootTypeNode, AstDirNode, AstFileNode, AstRootNode } from './directoryToAst';

/**
 * Do not traverse children
 */
export const VISITOR_SKIP_CHILDREN = false;

/**
 * Means remove Node from Ast and do not traverse children
 */
export const VISITOR_REMOVE_NODE = null;

export type VisitorEmptyResult =
  | void // just move further
  | typeof VISITOR_REMOVE_NODE
  | typeof VISITOR_SKIP_CHILDREN;

export type VisitKindFn<NodeKind> = (
  node: NodeKind,
  info: VisitInfo
) => VisitorEmptyResult | NodeKind;

export type AstVisitor = {
  DIR?: VisitKindFn<AstDirNode>;
  FILE?: VisitKindFn<AstFileNode>;
  ROOT_TYPE?: VisitKindFn<AstRootTypeNode>;
};

export interface VisitInfo {
  parent: AstDirNode | AstRootTypeNode | AstRootNode;
  name: string;
  path: string[];
}

export function astVisitor(ast: AstRootNode, visitor: AstVisitor): void {
  forEachKey(ast.children, (childNode, name) => {
    if (childNode) visitNode(childNode, visitor, { parent: ast, name, path: [] });
  });
}

export function visitNode(
  node: AstDirNode | AstFileNode | AstRootTypeNode,
  visitor: AstVisitor,
  info: VisitInfo
) {
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
    forEachKey(result.children, (childNode, name) => {
      visitNode(childNode, visitor, {
        parent: result as AstDirNode,
        name,
        path: [...info.path, info.name],
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
