import fs from 'fs';
import { join, resolve, dirname, basename } from 'path';

export interface DirectoryToAstOptions {
  relativePath?: string;
  extensions?: string[];
  include?: RegExp | ((path: string, kind: 'dir' | 'file', filename: string) => boolean);
  exclude?: RegExp | ((path: string, kind: 'dir' | 'file', filename: string) => boolean);
}

export type AstNodeKinds = 'rootType' | 'dir' | 'file' | 'root';

export interface AstBaseNode {
  kind: AstNodeKinds;
  name: string;
  absPath: string;
}

export interface AstRootTypeNode extends AstBaseNode {
  kind: 'rootType';
  children: AstDirChildren;
  namespaceConfig?: AstFileNode;
}

export type AstDirChildren = {
  [key: string]: AstDirNode | AstFileNode;
};

export interface AstDirNode extends AstBaseNode {
  kind: 'dir';
  children: AstDirChildren;
  namespaceConfig?: AstFileNode;
}

export interface AstFileNode extends AstBaseNode {
  kind: 'file';
  code: {
    default?: any;
  };
}

export type RootTypeNames = 'query' | 'mutation' | 'subscription';

export interface AstRootNode extends AstBaseNode {
  kind: 'root';
  children: {
    [T in RootTypeNames]?: AstRootTypeNode;
  };
}

export const defaultOptions: DirectoryToAstOptions = {
  extensions: ['js', 'ts'],
};

export function directoryToAst(
  m: NodeModule,
  options: DirectoryToAstOptions = defaultOptions
): AstRootNode {
  // if no path was passed in, assume the equivelant of __dirname from caller
  // otherwise, resolve path relative to the equivalent of __dirname
  const schemaPath = options?.relativePath
    ? resolve(dirname(m.filename), options.relativePath)
    : dirname(m.filename);

  // setup default options
  Object.keys(defaultOptions).forEach((prop) => {
    if (typeof (options as any)[prop] === 'undefined') {
      (options as any)[prop] = (defaultOptions as any)[prop];
    }
  });

  const result = {
    kind: 'root',
    name: basename(schemaPath),
    absPath: schemaPath,
    children: {},
  } as AstRootNode;

  fs.readdirSync(schemaPath).forEach((filename) => {
    const absPath = join(schemaPath, filename);

    if (fs.statSync(absPath).isDirectory()) {
      const dirName = filename;
      const re = /^(query|mutation|subscription)(\.(.*))?$/i;
      const found = dirName.match(re);
      if (found) {
        const opType = found[1].toLowerCase() as keyof AstRootNode['children'];
        let rootTypeAst = result.children[opType];
        if (!rootTypeAst)
          rootTypeAst = {
            kind: 'rootType',
            name: opType,
            absPath,
            children: {},
          } as AstRootTypeNode;

        const astDir = getAstForDir(m, absPath, options);
        if (astDir) {
          const subField = found[3]; // any part after dot (eg for `query.me` will be `me`)
          if (subField) {
            rootTypeAst.children[subField] = {
              ...astDir,
              name: subField,
              absPath,
            };
          } else {
            rootTypeAst.children = astDir.children;
            if (astDir.namespaceConfig) {
              rootTypeAst.namespaceConfig = astDir.namespaceConfig;
            }
          }
          result.children[opType] = rootTypeAst;
        }
      }
    }
  });

  return result;
}

export function getAstForDir(
  m: NodeModule,
  absPath: string,
  options: DirectoryToAstOptions = defaultOptions
): AstDirNode | void {
  const name = basename(absPath);

  if (!checkInclusion(absPath, 'dir', name, options)) return;

  const result: AstDirNode = {
    kind: 'dir',
    absPath,
    name,
    children: {},
  };

  // get the path of each file in specified directory, append to current tree node, recurse
  fs.readdirSync(absPath).forEach((filename) => {
    const absFilePath = join(absPath, filename);

    const stat = fs.statSync(absFilePath);
    if (stat.isDirectory()) {
      // this node is a directory; recurse
      if (result.children[filename]) {
        throw new Error(
          `You have a folder and file with same name "${filename}" by the following path ${absPath}. Please remove one of them.`
        );
      }
      const astDir = getAstForDir(m, absFilePath, options);
      if (astDir) {
        result.children[filename] = astDir;
      }
    } else if (stat.isFile()) {
      // this node is a file
      const fileAst = getAstForFile(m, absFilePath, options);
      if (fileAst) {
        if (fileAst.name === 'index') {
          result.namespaceConfig = fileAst;
        } else if (result.children[fileAst.name]) {
          throw new Error(
            `You have a folder and file with same name "${fileAst.name}" by the following path ${absPath}. Please remove one of them.`
          );
        } else {
          result.children[fileAst.name] = fileAst;
        }
      }
    }
  });

  return result;
}

export function getAstForFile(
  m: NodeModule,
  absPath: string,
  options: DirectoryToAstOptions = defaultOptions
): AstFileNode | void {
  const filename = basename(absPath);
  if (absPath !== m.filename && checkInclusion(absPath, 'file', filename, options)) {
    // module name shouldn't include file extension
    const moduleName = filename.substring(0, filename.lastIndexOf('.'));
    return {
      kind: 'file',
      name: moduleName,
      absPath,
      code: m.require(absPath),
    };
  }
}

function checkInclusion(
  absPath: string,
  kind: 'dir' | 'file',
  filename: string,
  options: DirectoryToAstOptions
): boolean {
  // Skip dir/files started from double underscore
  if (/^__.*/i.test(filename)) {
    return false;
  }

  // Skip dir/files started from dot
  if (/^\..*/i.test(filename)) {
    return false;
  }

  if (kind === 'file') {
    if (
      // Verify file has valid extension
      !new RegExp('\\.(' + (options?.extensions || ['js', 'ts']).join('|') + ')$', 'i').test(
        filename
      ) ||
      // Hardcoded skip file extensions
      // typescript definition files
      new RegExp('(\\.d\\.ts)$', 'i').test(filename) ||
      // test files
      new RegExp('(\\.spec\\.(ts|js))$', 'i').test(filename)
    ) {
      return false;
    }
  }

  if (options.include) {
    if (options.include instanceof RegExp) {
      // if options.include is a RegExp, evaluate it and make sure the path passes
      if (!options.include.test(absPath)) return false;
    } else if (typeof options.include === 'function') {
      // if options.include is a function, evaluate it and make sure the path passes
      if (!options.include(absPath, kind, filename)) return false;
    }
  }

  if (options.exclude) {
    if (options.exclude instanceof RegExp) {
      // if options.exclude is a RegExp, evaluate it and make sure the path doesn't pass
      if (options.exclude.test(absPath)) return false;
    } else if (typeof options.exclude === 'function') {
      // if options.exclude is a function, evaluate it and make sure the path doesn't pass
      if (options.exclude(absPath, kind, filename)) return false;
    }
  }

  return true;
}
