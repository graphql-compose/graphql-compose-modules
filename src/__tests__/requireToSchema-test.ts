import { requireSchemaDirectory } from '../requireSchemaDirectory';
import { requireToSchema } from '../requireToSchema';
import { SchemaComposer } from 'graphql-compose';
import { printSchema } from 'graphql/utilities';

describe('requireToSchema()', () => {
  describe('Schema ../../examples/forTests/schema', () => {
    const ast = requireSchemaDirectory(module, '../../examples/forTests/schema');
    const sc = requireToSchema(ast);

    it('should return schema composer', () => {
      expect(sc).toBeInstanceOf(SchemaComposer);
    });

    it('schema', async () => {
      const printedSchema = await printSchema(sc.buildSchema(), { commentDescriptions: true });
      expect(printedSchema).toMatchSnapshot();
    });
  });
});
