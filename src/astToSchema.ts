import {
  SchemaComposer,
  ObjectTypeComposer,
  upperFirst,
  ObjectTypeComposerFieldConfig,
  isOutputTypeDefinitionString,
  isWrappedTypeNameString,
  inspect,
} from 'graphql-compose';
import { AstRootNode, AstRootTypeNode, AstDirNode, AstFileNode } from './directoryToAst';
import dedent from 'dedent';
import { GraphQLObjectType } from 'graphql';

export interface AstToSchemaOptions {
  /**
   * Pass here already existed SchemaComposer instance
   * which already contains some types (eg with custom Scalars).
   *
   * Or new SchemaComposer instance will be created.
   */
  schemaComposer?: SchemaComposer<any>;
  prefix?: string;
  suffix?: string;
}

/**
 * Transform AST to GraphQL Schema.
 *
 * @example
 *   // Scan some directory for getting Schema entrypoints as AST nodes.
 *   const ast = directoryToAst(module);
 *
 *   // [Optional] Combining severals ast into source
 *   // Useful if some sub-schemas are delivered via packages
 *   // or created n separate directories.
 *   const newAST = astMerge(ast, ast1, ast2, ...);
 *
 *   // [Optional] Some `ast` modifications
 *   // Useful for writing some middlewares
 *   // which transform FieldConfigs entrypoints.
 *   astVisitor(newAST, visitorFns);
 *
 *   // Create SchemaComposer instance with all populated types & fields
 *   // It provides declarative programmatic access to modify you schema
 *   const schemaComposer = astToSchema(newAST, opts);
 *
 *   // Create GraphQLSchema instance which is ready for runtime.
 *   const schema = schemaComposer.buildSchema();;
 */
export function astToSchema<TContext = any>(
  ast: AstRootNode,
  opts: AstToSchemaOptions = {}
): SchemaComposer<TContext> {
  let sc: SchemaComposer<any>;

  if (opts?.schemaComposer) {
    if (!opts.schemaComposer) {
      throw new Error(dedent`
        Provided option 'schemaComposer' should be an instance of SchemaComposer class from 'graphql-compose' package.
        Received:
          ${inspect(opts.schemaComposer)}
      `);
    }
    sc = opts.schemaComposer;
  } else {
    sc = new SchemaComposer();
  }

  if (ast.children.query) populateRoot(sc, 'Query', ast.children.query, opts);
  if (ast.children.mutation) populateRoot(sc, 'Mutation', ast.children.mutation, opts);
  if (ast.children.subscription) populateRoot(sc, 'Subscription', ast.children.subscription, opts);

  return sc;
}

function populateRoot(
  sc: SchemaComposer<any>,
  rootName: 'Query' | 'Mutation' | 'Subscription',
  astRootNode: AstRootTypeNode,
  opts?: AstToSchemaOptions
) {
  const tc = sc[rootName];
  Object.keys(astRootNode.children).forEach((key) => {
    createFields(sc, astRootNode.children[key], tc, rootName, opts || {});
  });
}

export function createFields(
  sc: SchemaComposer<any>,
  ast: AstDirNode | AstFileNode | void,
  parent: ObjectTypeComposer,
  pathPrefix: string,
  opts: AstToSchemaOptions = {}
): void {
  if (!ast) return;

  const name = ast.name;
  if (!/^[._a-zA-Z0-9]+$/.test(name)) {
    throw new Error(
      `You provide incorrect ${
        ast.kind === 'file' ? 'file' : 'directory'
      } name '${name}', it should meet RegExp(/^[._a-zA-Z0-9]+$/) for '${ast.absPath}'`
    );
  }

  if (ast.kind === 'file') {
    parent.addNestedFields({
      [name]: ast.fieldConfig,
    });
    return;
  }

  if (ast.kind === 'dir') {
    const typename = getTypename(ast, pathPrefix, opts);
    let fc: ObjectTypeComposerFieldConfig<any, any>;
    if (ast.namespaceConfig) {
      fc = prepareNamespaceFieldConfig(sc, ast.namespaceConfig, typename);
    } else {
      fc = { type: sc.createObjectTC(typename) };
    }

    parent.addNestedFields({
      [name]: {
        resolve: (source) => source,
        ...fc,
      },
    });

    const pathPrefixForChild = getTypename(ast, pathPrefix, {});
    Object.keys(ast.children).forEach((key) => {
      createFields(sc, ast.children[key], fc.type as any, pathPrefixForChild, opts);
    });
  }
}

function getTypename(
  ast: AstDirNode | AstFileNode,
  pathPrefix: string,
  opts: AstToSchemaOptions
): string {
  const name = ast.name;

  let typename = pathPrefix;
  if (name.indexOf('.') !== -1) {
    const namesArray = name.split('.');

    if (namesArray.some((n) => !n)) {
      throw new Error(
        `Field name '${ast.name}' contains dots in the wrong place for '${ast.absPath}'!`
      );
    }

    typename += namesArray.reduce((prev, current) => {
      return prev + upperFirst(current);
    }, '');
  } else {
    typename += upperFirst(name);
  }

  if (opts.prefix) typename = `${opts.prefix}${typename}`;
  if (opts.suffix) typename += opts.suffix;
  return typename;
}

function prepareNamespaceFieldConfig(
  sc: SchemaComposer<any>,
  ast: AstFileNode,
  typename: string
): ObjectTypeComposerFieldConfig<any, any> {
  const fc = ast.fieldConfig as any;

  if (!fc.type) {
    fc.type = sc.createObjectTC(typename);
  } else {
    if (typeof fc.type === 'string') {
      if (!isOutputTypeDefinitionString(fc.type) && !isWrappedTypeNameString(fc.type)) {
        throw new Error(dedent`
          You provide incorrect output type definition:
            ${fc.type}
          It must be valid TypeName or output type SDL definition:

          Eg.
            type Payload { me: String }
          OR
            Payload
        `);
      }
    } else if (
      !(fc.type instanceof ObjectTypeComposer) &&
      !(fc.type instanceof GraphQLObjectType)
    ) {
      throw new Error(dedent`
        You provide some strange value as 'type':
          ${inspect(fc.type)}
      `);
    }
    fc.type = sc.createObjectTC(fc.type);
  }

  if (!fc.resolve) {
    fc.resolve = () => ({});
  }

  return fc;
}
