import fs from 'fs';
import { join, resolve, dirname, basename } from 'path';

interface Options {
  extensions: string[];
  include?: RegExp | ((path: string, filename: string) => boolean);
  exclude?: RegExp | ((path: string, filename: string) => boolean);
}

type RequireAstNodeKinds = 'rootType' | 'dir' | 'file';

interface RequireAstBaseNode {
  kind: RequireAstNodeKinds;
  name: string;
  absPath: string;
}

export interface RequireAstRootTypeNode extends RequireAstBaseNode {
  kind: 'rootType';
  children: {
    [key: string]: RequireAstDirNode | RequireAstFileNode;
  };
}

export interface RequireAstDirNode extends RequireAstBaseNode {
  kind: 'dir';
  children: {
    [key: string]: RequireAstDirNode | RequireAstFileNode;
  };
}

export interface RequireAstFileNode extends RequireAstBaseNode {
  kind: 'file';
  code: {
    default?: any;
  };
}

export interface RequireAstResult {
  query?: RequireAstRootTypeNode;
  mutation?: RequireAstRootTypeNode;
  subscription?: RequireAstRootTypeNode;
}

export const defaultOptions: Options = {
  extensions: ['js', 'ts'],
};

export function requireSchemaDirectory(
  m: NodeModule,
  path?: string,
  options: Options = defaultOptions
): RequireAstResult {
  // if no path was passed in, assume the equivelant of __dirname from caller
  // otherwise, resolve path relative to the equivalent of __dirname
  const schemaPath = !path ? dirname(m.filename) : resolve(dirname(m.filename), path);

  const result = {} as RequireAstResult;

  fs.readdirSync(schemaPath).forEach((filename) => {
    const absPath = join(schemaPath, filename);

    if (fs.statSync(absPath).isDirectory()) {
      const dirName = filename;
      const re = /^(query|mutation|subscription)(\.(.*))?$/i;
      const found = dirName.match(re);
      if (found) {
        const opType = found[1].toLowerCase() as keyof RequireAstResult;
        if (!result[opType])
          result[opType] = {
            kind: 'rootType',
            name: opType,
            absPath,
            children: {},
          } as RequireAstRootTypeNode;

        const subField = found[3]; // any part after dot (eg for `query.me` will be `me`)
        if (subField) {
          result[opType].children[subField] = {
            ...requireSubDirectory(m, absPath, options),
            name: subField,
            absPath,
          };
        } else {
          result[opType].children = requireSubDirectory(m, absPath, options).children;
        }
      }
    }
  });

  return result;
}

export function requireSubDirectory(
  m: NodeModule,
  path: string,
  options: Options = defaultOptions
): RequireAstDirNode {
  const result: RequireAstDirNode = {
    kind: 'dir',
    absPath: resolve(dirname(m.filename), path),
    name: basename(path),
    children: {},
  };

  // setup default options
  Object.keys(defaultOptions).forEach((prop) => {
    if (typeof options[prop] === 'undefined') {
      options[prop] = defaultOptions[prop];
    }
  });

  // get the path of each file in specified directory, append to current tree node, recurse
  fs.readdirSync(path).forEach((filename) => {
    const absPath = join(path, filename);

    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      // this node is a directory; recurse
      if (result.children[filename]) {
        throw new Error(
          `You have a folder and file with same name "${filename}" by the following path ${path}. Please remove one of them.`
        );
      }
      result.children[filename] = requireSubDirectory(m, absPath, options);
    } else if (stat.isFile()) {
      // this node is a file
      if (absPath !== m.filename && checkFileInclusion(absPath, filename, options)) {
        // hash node key shouldn't include file extension
        const moduleName = filename.substring(0, filename.lastIndexOf('.'));
        if (result.children[moduleName]) {
          throw new Error(
            `You have a folder and file with same name "${moduleName}" by the following path ${path}. Please remove one of them.`
          );
        }
        result.children[moduleName] = {
          kind: 'file',
          name: moduleName,
          absPath,
          code: m.require(absPath),
        };
      }
    }
  });

  return result;
}

function checkFileInclusion(absPath: string, filename: string, options: Options): boolean {
  return (
    // verify file has valid extension
    new RegExp('\\.(' + options.extensions.join('|') + ')$', 'i').test(filename) &&
    // if options.include is a RegExp, evaluate it and make sure the path passes
    !(options.include && options.include instanceof RegExp && !options.include.test(absPath)) &&
    // if options.include is a function, evaluate it and make sure the path passes
    !(
      options.include &&
      typeof options.include === 'function' &&
      !options.include(absPath, filename)
    ) &&
    // if options.exclude is a RegExp, evaluate it and make sure the path doesn't pass
    !(options.exclude && options.exclude instanceof RegExp && options.exclude.test(absPath)) &&
    // if options.exclude is a function, evaluate it and make sure the path doesn't pass
    !(
      options.exclude &&
      typeof options.exclude === 'function' &&
      options.exclude(absPath, filename)
    )
  );
}
