import { AstRootNode, AstRootTypeNode, RootTypeNames, AstDirChildren } from './directoryToAst';

export function astMerge(...asts: Array<AstRootNode>): AstRootNode {
  const mergedAST = {
    kind: 'root',
    name: 'merged',
    absPath: 'merged',
    children: {},
  } as AstRootNode;

  asts.forEach((ast) => {
    mergedAST.name += `; ${ast.name}`;
    mergedAST.absPath += `; ${ast.absPath}`;

    // merge rootTypes
    Object.keys(ast.children).forEach((key) => {
      const rootName = key as RootTypeNames;
      const rootTypeNode = ast.children[rootName] as AstRootTypeNode;

      let mergedRootTypeAST = mergedAST.children[rootName];
      if (!mergedRootTypeAST) {
        mergedRootTypeAST = {
          kind: 'rootType',
          name: rootTypeNode.name,
          absPath: 'merged',
          children: {},
        } as AstRootTypeNode;
        mergedAST.children[rootName] = mergedRootTypeAST;
      }
      mergedRootTypeAST.absPath += `; ${rootTypeNode.absPath}`;

      // maybe in future namespaceConfig will be refactored
      // but now it just take last one
      if (rootTypeNode.namespaceConfig) {
        mergedRootTypeAST.namespaceConfig = rootTypeNode.namespaceConfig;
      }

      mergedRootTypeAST.children = mergeChildren(mergedRootTypeAST.children, rootTypeNode.children);
    });
  });

  return mergedAST;
}

function mergeChildren(target: AstDirChildren, source: AstDirChildren): AstDirChildren {
  const result = { ...target };
  Object.keys(source).forEach((key) => {
    const targetChild = target[key];
    const sourceChild = source[key];
    if (!targetChild) {
      // add new key from source
      result[key] = sourceChild;
    } else if (targetChild.kind === 'dir') {
      if (sourceChild.kind === 'dir') {
        // merge dirs
        const mergedDirNode = {
          ...targetChild,
          absPath: `merged; ${targetChild.absPath}; ${sourceChild.absPath}`,
          children: mergeChildren(targetChild.children, sourceChild.children),
        };
        if (sourceChild.namespaceConfig) {
          mergedDirNode.namespaceConfig = sourceChild.namespaceConfig;
        }
        result[key] = mergedDirNode;
      } else if (sourceChild.kind === 'file') {
        // replace dir by file from source
        result[key] = sourceChild;
      }
    } else if (targetChild.kind === 'file') {
      // replace file by any source type
      result[key] = sourceChild;
    }
  });

  return result;
}
