import { ObjectTypeComposerFieldConfigAsObjectDefinition } from 'graphql-compose';

/**
 * General type annotation for default export of your modules inside schema directory.
 *
 * @example schema/query/ping.ts
 *   import { FieldConfig } from 'graphql-compose-modules';
 *
 *   export default {
 *     type: 'String',
 *     resolve: () => 'pong',
 *   } as FieldConfig;
 */
export type FieldConfig<
  TContext = any,
  TArgs = any,
  TSource = any
> = ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>;

/**
 * Specific type annotation for index.ts files in you folders.
 * index.ts files have specific purpose to extend or override
 * automatically generated ObjectType for directory.
 *
 * For example you have the following structure in `schema` folder:
 *   query/
 *     viewer/
 *       index.ts  <--- will extend/override definition of `viewer/` type
 *       articles.ts  <--- just add a field with name `articles` to `viewer/` type
 *
 * So the next code extends logic of `viewer/` type
 *   - provide custom name for generated type (instead of `Viewer` will be `AuthorizedUser`)
 *   - if `context.user` is empty then return error in runtime to the client
 * @example query/viewer/index.ts
 *   import { NamespaceConfig } from 'graphql-compose-modules';
 *
 *   export default {
 *     type: 'AuthorizedUser',
 *     resolve: (parent, args, context, info) => {
 *       if (!context.user) throw new Error('You should be authenticated user to access `viewer` field');
 *       return {};
 *     },
 *   } as NamespaceConfig;
 */
export type NamespaceConfig<TContext = any, TArgs = any, TSource = any> = Partial<
  ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>
>;
