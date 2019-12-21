import { directoryToAst, getAstForDir, getAstForFile } from '../directoryToAst';
import { astToSchema, createFields } from '../astToSchema';
import { SchemaComposer } from 'graphql-compose';
import { printSchema } from 'graphql/utilities';
import path from 'path';

describe('astToSchema()', () => {
  describe('Schema ./__testSchema__', () => {
    const ast = directoryToAst(module, { relativePath: './__testSchema__' });
    const sc = astToSchema(ast);

    it('should return schema composer', () => {
      expect(sc).toBeInstanceOf(SchemaComposer);
    });

    it('schema', async () => {
      const printedSchema = await printSchema(sc.buildSchema(), { commentDescriptions: true });
      expect(printedSchema).toMatchSnapshot();
    });
  });

  describe('createFields', () => {
    let sc: SchemaComposer<any>;
    beforeEach(() => {
      sc = new SchemaComposer();
    });

    it('file: query/field.ts', () => {
      createFields(
        sc,
        getAstForFile(module, path.resolve(__dirname, './__testSchema__/query/field.ts')),
        'Query',
        sc.Query
      );
      expect(sc.Query.hasField('field')).toBeTruthy();
      expect(sc.Query.getFieldTypeName('field')).toBe('String');
    });

    it('file: query/some.nested.ts', () => {
      createFields(
        sc,
        getAstForFile(module, path.resolve(__dirname, './__testSchema__/query/some.nested.ts')),
        'Query',
        sc.Query
      );
      expect(sc.Query.hasField('some')).toBeTruthy();
      expect(sc.Query.getFieldTypeName('some')).toBe('QuerySome');
      expect(sc.Query.getFieldOTC('some').hasField('nested')).toBeTruthy();
      expect(sc.Query.getFieldOTC('some').getFieldTypeName('nested')).toBe('Int');
    });

    it('file: query/some.type.index.ts', () => {
      createFields(
        sc,
        getAstForFile(module, path.resolve(__dirname, './__testSchema__/query/some.type.index.ts')),
        'Query',
        sc.Query
      );
      expect(sc.Query.hasField('some')).toBeTruthy();
      expect(sc.Query.getFieldTypeName('some')).toBe('QuerySome');
      expect(sc.Query.getFieldOTC('some').hasField('type')).toBeTruthy();
      expect(sc.Query.getFieldOTC('some').getFieldTypeName('type')).toBe('SomeIndexFileType');
      expect((sc.Query.getFieldOTC('some').getFieldConfig('type') as any).resolve()).toEqual({
        awesomeValue: 'awesomeValue',
      });
    });

    it('dir: query/me/', () => {
      createFields(
        sc,
        getAstForDir(module, path.resolve(__dirname, './__testSchema__/query/me')),
        'Query',
        sc.Query
      );
      expect(sc.Query.hasField('me')).toBeTruthy();
      expect(sc.Query.getFieldTypeName('me')).toBe('QueryMe');

      // check query/me/index.ts
      // should provide args for `me` field
      expect(sc.Query.getFieldArgTypeName('me', 'arg')).toBe('Int');
      expect(() => (sc.Query.getFieldConfig('me') as any).resolve()).toThrow(
        'You should be the ADMIN'
      );
      // check that fields from sibling files was added
      expect(sc.Query.getFieldOTC('me').getFieldTypeName('name')).toBe('String');
      expect((sc.Query.getFieldOTC('me').getFieldConfig('name') as any).resolve()).toBe('nodkz');
      expect(
        sc.Query.getFieldOTC('me')
          .getFieldOTC('address')
          .getTypeName()
      ).toBe('QueryMeAddress');
      expect(
        sc.Query.getFieldOTC('me')
          .getFieldOTC('address')
          .getFieldNames()
          .sort()
      ).toEqual(['city', 'street']);
    });
  });

  it('should properly set name for nested fields with dot notation', () => {
    const ast = directoryToAst(module, {
      relativePath: './__testSchema__',
      include: /query\.auth$|query\.auth\/nested/,
    });
    const sc = astToSchema(ast);
    expect(sc.Query.getFieldOTC('auth').getFieldTypeName('nested')).toBe('QueryAuthNested');
  });
});
