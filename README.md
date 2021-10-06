# graphql-compose-modules

[![npm](https://img.shields.io/npm/v/graphql-compose-modules.svg)](https://www.npmjs.com/package/graphql-compose-modules)
[![Codecov coverage](https://img.shields.io/codecov/c/github/graphql-compose/graphql-compose-modules.svg)](https://codecov.io/github/graphql-compose/graphql-compose-modules)
[![Github Actions](https://github.com/graphql-compose/graphql-compose-modules/workflows/Build%20CI/badge.svg)](https://github.com/graphql-compose/graphql-compose-modules/actions)
[![Trends](https://img.shields.io/npm/dt/graphql-compose-modules.svg)](http://www.npmtrends.com/graphql-compose-modules)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg)
[![Backers on Open Collective](https://opencollective.com/graphql-compose/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/graphql-compose/sponsors/badge.svg)](#sponsors)

This is a toolkit for creating big GraphQL schemas with code-first approach in JavaScript.

## Quick demo

You may find a simple GraphQL server example in the following folder: [examples/simple](./examples/simple).

## GraphQL schema entrypoints from a file structure

When you are using code-first approach in GraphQL Schema construction you may face problem when you cannot understand which entrypoints your schema has. And where exactly the code is placed which serve this or that entrypoint.

![overview](./docs/diagrams/overview.drawio.svg)

`graphql-compose-modules` uses a file-system based schema entrypoint definition (something like NextJS does with its pages concept for routing). You just create folder `schema/` and put inside it the following sub-folders (root directories): `query`, `mutation` and `subscription`. Inside these folders you may put `.js` or `.ts` files with FieldConfigs which describes entrypoints. Assume you create the following directory structure:

```bash
schema/
  query/
    articleById.ts
    articlesList.ts
  mutation/
    createArticle.ts
    updateArticle.ts
    removeArticle.ts
  subscription/
    onArticleChange.ts
```

With this directory structure `graphql-compose-modules` will use file names as field names for your root types and you get the following GraphQL schema:

```graphql
type Query {
  articleById: ...
  articlesList: ...
}

type Mutation {
  createArticle: ...
  updateArticle: ...
  removeArticle: ...
}

type Subscription {
  onArticleChange: ...
}
```

If you want rename field `articlesList` to `articles` in your schema just rename `articlesList.ts` file. If you want to add a new field to Schema – just add a new file to `Query`, `Mutation`, `Subscription` folders. **This simple approach helps you understand entrypoints of your schema without launching the GraphQL server – what you see in folders that you get in GraphQL Schema**.

## Describing Entrypoints in files

Every Entrypoint (FieldConfig definition) is described in a separate file. This file contains information about input args, output type, resolve function and additional fields like description, deprecationReason, extensions. As an example let's create `schema/Query/sum.ts` and put inside the following content:

```ts
export default {
  type: 'Int!',
  args: {
    a: 'Int!',
    b: 'Int!',
  },
  resolve: (source, args, context, info) => {
    return args.a + args.b;
  },
  description: 'This method sums two numbers',
  deprecationReason: 'This method is deprecated and will be removed soon.',
  extensions: {
    someExtraParam: 'Can be used for AST transformers',
  },
};
```

If you are familiar with [graphql-js FieldConfig definition](https://graphql.org/graphql-js/type/#examples) then you may notice that `type` & `args` properties are defined in SDL format. This syntax sugar is provided by [graphql-compose](https://github.com/graphql-compose/graphql-compose#examples) package.

## Entrypoints with namespaces for big schemas

If your GraphQL Schema has a lot of entrypoints you may create sub-folders for grouping them under Namespaces:

```bash
schema/
  query/
    articles/
      byId.ts
      list.ts
    ...
  mutation/
    articles/
      create.ts
      update.ts
      remove.ts
    ...
```

With such structure you will get the following schema – namespace types `QueryArticles` & `MutationArticles` are created automatically:

```graphql
type Query {
  articles: QueryArticles
}

type Mutation {
  articles: MutationArticles
}

type QueryArticles {
  byId: ...
  list: ...
}

type MutationArticles {
  create: ...
  update: ...
  remove: ...
}
```

You may use namespaces (sub-folders) for `Query` & `Mutation` and all servers supports this feature. But for `Subscription` most current server implementations (eg. [apollo-server](https://www.apollographql.com/docs/apollo-server/data/subscriptions/)) does not support this yet.

## GraphQLSchema construction

In `schema` folder create a file `index.ts` with the following content which traverses `query`, `mutation`, `subscription` folders and creates a `GraphQLSchema` instance for you:

```ts
import { buildSchema } from 'graphql-compose-modules';

export const schema = buildSchema(module);
```

After that you may create a GraphQL server:

```ts
import { ApolloServer } from 'apollo-server';
import { schema } from './schema';

const server = new ApolloServer({ schema });

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Advanced GraphQLSchema construction

If you want transform AST of entrypoints (e.g. for adding authorization, logging, tracing) and for merging with another schemas distributed via npm packages – you may use the following advanced way for schema construction:

```ts
import { directoryToAst, astToSchema, astMerge } from 'graphql-compose-modules';
import { addQueryToMutations } from './transformers/addQueryToMutations';
import { remoteServiceAST } from '@internal/some-service';

// traverse `query`, `mutation`, `subscription` folders placed near this module
let ast = directoryToAst(module);

// apply transformer which uses astVisitor() method under the hood
addQueryToMutations(ast);

// merge with other ASTs distributed via npm packages
ast = astMerge(ast, remoteServiceAST);

// construct SchemaComposer
const sc = astToSchema(ast);

// construct GraphQLSchema instance and export it
export const schema = sc.buildSchema();
```

## Writing own transformer for entrypoints

For writing your own transformers you need to use `astVisitor()` method. For instance let's implement `addQueryToMutations` transformer which adds `query: Query` field to all your mutations:

```ts
import { astVisitor, VISITOR_SKIP_CHILDREN, AstRootNode } from 'graphql-compose-modules';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';

export function addQueryToMutations(
  ast: AstRootNode,
  schemaComposer: SchemaComposer<any>
): void {
  astVisitor(ast, schemaComposer, {
    // skip `query` & `subscriptions` root types
    ROOT_TYPE: (info) => {
      if (!info.isMutation) {
        return VISITOR_SKIP_CHILDREN;
      }
      return;
    },
    // for every file in `mutation` folder try to add `query` field if it does not exists
    FILE: (info) => {
      // get FieldConfig from loaded file in `schema` folder
      const fieldConfig = info.fieldConfig || {};

      // if `resolve` method does not exist then skip this transformation
      const next = fieldConfig.resolve;
      if (!next) return;

      // if output type isn't an object then skip this transformation
      if (!info.isOutputTypeIsObject()) return;

      const outputTC = info.getOutputUnwrappedOTC();
      if (outputTC.hasField('query')) return;
      outputTC.setField('query', {
        description: 'Sub-query which have to be executed after mutation.',
        type: schemaComposer.Query,
      });

      fieldConfig.resolve = async (s: any, args: any, context: any, i: any) => {
        const result = await next(s, args, context, i);
        return {
          query: {},
          ...result,
        };
      };
    },
  });
}
```

## API

### Main API method:

- `buildSchema(module: NodeModule, opts: BuildOptions): GraphQLSchema` – use this method for creating graphql schema from directory

### Advanced API methods:

The following methods help to use schema composition, applying middlewares and schema transformation via visitor pattern:

![overview](./docs/diagrams/ast-transformation.drawio.svg)

- `directoryToAst(module: NodeModule, options: DirectoryToAstOptions): AstRootNode` – traverses directories and construct AST for your graphql entrypoints
- `astToSchema(ast: AstRootNode, opts: AstToSchemaOptions): SchemaComposer` – converts AST to GraphQL Schema
- `astMerge(...asts: Array<AstRootNode>): AstRootNode` – combines several ASTs to one AST (helps compose several graphql schemas which may be distributed via npm packages)
- `astVisitor(ast: AstRootNode, schemaComposer: SchemaComposer, visitor: AstVisitor): void` – modify AST via visitor pattern. This method is used for construction of your AST transformers.
