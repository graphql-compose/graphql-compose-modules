import { ObjectTypeComposerFieldConfigAsObjectDefinition } from 'graphql-compose';

export type FieldConfig<
  TContext = any,
  TArgs = any,
  TSource = any
> = ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>;

export type NamespaceConfig<TContext = any, TArgs = any, TSource = any> = Partial<
  ObjectTypeComposerFieldConfigAsObjectDefinition<TSource, TContext, TArgs>
>;
