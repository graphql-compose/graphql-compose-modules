import { requireSchemaDirectory } from '../requireSchemaDirectory';
import { requireAstToSchema } from '../requireAstToSchema';
import { SchemaComposer } from 'graphql-compose';
import { printSchema } from 'graphql/utilities';

describe('requireAstToSchema()', () => {
  describe('Schema ../../examples/forTests/schema', () => {
    const ast = requireSchemaDirectory(module, { relativePath: '../../examples/forTests/schema' });
    const sc = requireAstToSchema(ast);

    it('should return schema composer', () => {
      expect(sc).toBeInstanceOf(SchemaComposer);
    });

    it('schema', async () => {
      const printedSchema = await printSchema(sc.buildSchema(), { commentDescriptions: true });
      expect(printedSchema).toMatchSnapshot();
    });
  });
});
