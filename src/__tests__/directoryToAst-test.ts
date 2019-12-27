import { directoryToAst } from '../directoryToAst';

describe('directoryToAst()', () => {
  describe('Schema ./__testSchema__', () => {
    const ast = directoryToAst(module, { relativePath: './__testSchema__' });

    it('should return root types', () => {
      expect(Object.keys(ast)).toEqual(expect.arrayContaining(['query', 'mutation']));
    });

    it('query has proper values', () => {
      expect(ast.query).toMatchSnapshot({
        name: 'query',
        kind: 'rootType',
        absPath: expect.any(String),
        children: {
          auth: expect.objectContaining({ kind: 'dir' }),
          field: expect.objectContaining({ kind: 'file' }),
          me: {
            absPath: expect.any(String),
            children: {
              'address.city': expect.objectContaining({ kind: 'file' }),
              'address.street': expect.objectContaining({ kind: 'file' }),
              name: expect.objectContaining({ kind: 'file' }),
              index: {
                kind: 'file',
                name: 'index',
                absPath: expect.any(String),
                code: expect.any(Object),
              },
            },
          },
          index: { kind: 'file', absPath: expect.any(String), code: expect.any(Object) },
          'some.nested': expect.objectContaining({ kind: 'file' }),
          'some.type.index': expect.any(Object),
          user: {
            absPath: expect.any(String),
            children: {
              extendedData: expect.any(Object),
              index: expect.any(Object),
              roles: expect.any(Object),
            },
          },
        },
      });
    });

    it('mutation has proper values', () => {
      expect(ast.mutation).toMatchSnapshot({
        name: 'mutation',
        kind: 'rootType',
        absPath: expect.any(String),
        children: {
          auth: {
            absPath: expect.any(String),
            children: {
              index: expect.objectContaining({ kind: 'file' }),
              login: expect.objectContaining({ kind: 'file' }),
              logout: expect.objectContaining({ kind: 'file' }),
              nested: expect.objectContaining({ kind: 'dir' }),
            },
          },
          user: {
            absPath: expect.any(String),
            children: {
              create: expect.objectContaining({ kind: 'file' }),
              update: expect.objectContaining({ kind: 'file' }),
            },
          },
          'logs.nested': {
            absPath: expect.any(String),
            children: {
              list: expect.objectContaining({ kind: 'file' }),
            },
          },
        },
      });
    });
  });
});