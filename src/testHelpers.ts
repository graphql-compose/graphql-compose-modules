import { graphql, GraphQLSchema, ExecutionResult, GraphQLError } from 'graphql';
import {
  SchemaComposer,
  Resolver,
  ObjectTypeComposerFieldConfigAsObjectDefinition,
  inspect,
} from 'graphql-compose';

const FIELD = 'field';

interface RunQueryOpts {
  fc: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any, any> | Resolver;
  operation: string;
  variables?: Record<string, any>;
  source?: Record<string, any>;
  context?: Record<string, any>;
  schemaComposer?: SchemaComposer<any>;
}

export function testBuildSchema(
  fc: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any, any> | Resolver,
  schemaComposer?: SchemaComposer<any>
): GraphQLSchema {
  const sc = schemaComposer || new SchemaComposer();
  sc.Query.setField(FIELD, fc);
  return sc.buildSchema();
}

function _getArgsForQuery(
  fc: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any, any> | Resolver,
  variables: Record<string, any> = {},
  schemaComposer?: SchemaComposer<any>
): {
  queryVars: string;
  fieldVars: string;
} {
  const sc = schemaComposer || new SchemaComposer();
  sc.Query.setField(FIELD, fc);

  const varNames = Object.keys(variables);

  const argNames = sc.Query.getFieldArgNames(FIELD);
  if (argNames.length === 0 && varNames.length > 0) {
    throw new Error(
      `FieldConfig does not have any arguments. But in test you provided the following variables: ${inspect(
        variables
      )}`
    );
  }

  varNames.forEach((varName) => {
    if (!argNames.includes(varName)) {
      throw new Error(
        `FieldConfig does not have '${varName}' argument. Avaliable arguments: '${argNames.join(
          "', '"
        )}'.`
      );
    }
  });

  argNames.forEach((argName) => {
    if (sc.Query.isFieldArgNonNull(FIELD, argName)) {
      const val = variables[argName];
      if (val === null || val === undefined) {
        throw new Error(
          `FieldConfig has required argument '${argName}'. But you did not provide it in your test via variables: '${inspect(
            variables
          )}'.`
        );
      }
    }
  });

  const queryVars = varNames
    .map((n) => `$${n}: ${String(sc.Query.getFieldArgType(FIELD, n))}`)
    .join(' ');
  const fieldVars = varNames.map((n) => `${n}: $${n}`).join(' ');

  return {
    queryVars: queryVars ? `(${queryVars})` : '',
    fieldVars: fieldVars ? `(${fieldVars})` : '',
  };
}

export async function testOperation(opts: RunQueryOpts): Promise<ExecutionResult> {
  const schema = testBuildSchema(opts.fc, opts.schemaComposer);

  const res = await graphql({
    schema,
    source: opts.operation,
    rootValue: opts?.source,
    contextValue: opts?.context,
    variableValues: opts?.variables,
  });
  return res;
}

export async function testOperationData(
  opts: Omit<RunQueryOpts, 'operation'> & { selectionSet: string }
): Promise<Record<string, any> | null> {
  const { selectionSet, ...restOpts } = opts;

  const ac = _getArgsForQuery(opts.fc, opts.variables, opts.schemaComposer);
  const res = await testOperation({
    operation: `
        query ${ac.queryVars} {
          field${ac.fieldVars} ${selectionSet.trim()}
        }
      `,
    ...restOpts,
  });

  if (res.errors) {
    throw new Error((res?.errors?.[0] as any) || 'GraphQL Error');
  }

  return res?.data?.field;
}

export async function testOperationErrors(
  opts: RunQueryOpts
): Promise<readonly GraphQLError[] | void> {
  const res = await testOperation(opts);
  return res?.errors;
}

export function testSDL(opts: {
  fc: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any, any> | Resolver;
  schemaComposer?: SchemaComposer<any>;
  deep?: boolean;
}): string {
  const sc = opts.schemaComposer || new SchemaComposer();
  sc.Query.setField(FIELD, opts.fc);
  sc.buildSchema();
  return sc.Query.toSDL({
    deep: opts.deep ?? true,
    omitDescriptions: true,
  });
}
