import { buildSchema } from '../../../src';
import { SchemaComposer } from 'graphql-compose';

const schemaComposer = new SchemaComposer();
schemaComposer.Query.addFields({
  time: {
    type: 'String',
    resolve: () => Date.now(),
  },
});

export const schema = buildSchema(module, { schemaComposer });
