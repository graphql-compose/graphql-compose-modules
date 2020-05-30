import { directoryToAst } from '../directoryToAst';

describe('directoryToAst()', () => {
  describe('Schema ./__testSchema__', () => {
    const ast = directoryToAst(module, { relativePath: './__testSchema__' });

    it('should return root types', () => {
      expect(Object.keys(ast.children)).toEqual(expect.arrayContaining(['query', 'mutation']));
    });

    it('query has proper values', () => {
      expect(ast.children.query).toMatchSnapshot({
        name: 'query',
        kind: 'rootType',
        absPath: expect.any(String),
        children: {
          auth: {
            kind: 'dir',
            name: 'auth',
            absPath: expect.any(String),
            children: {
              isLoggedIn: expect.objectContaining({ kind: 'file' }),
              nested: expect.objectContaining({ kind: 'dir' }),
            },
          },
          field: expect.objectContaining({ kind: 'file' }),
          me: {
            absPath: expect.any(String),
            children: {
              'address.city': expect.objectContaining({ kind: 'file' }),
              'address.street': expect.objectContaining({ kind: 'file' }),
              name: expect.objectContaining({ kind: 'file' }),
            },
            namespaceConfig: {
              kind: 'file',
              name: 'index',
              absPath: expect.any(String),
              code: expect.any(Object),
            },
          },
          'some.nested': expect.objectContaining({ kind: 'file' }),
          'some.index': expect.any(Object),
          user: {
            absPath: expect.any(String),
            children: {
              extendedData: expect.any(Object),
              roles: expect.any(Object),
            },
            namespaceConfig: expect.any(Object),
          },
        },
        namespaceConfig: expect.any(Object),
      });
    });

    it('mutation has proper values', () => {
      expect(ast.children.mutation).toMatchSnapshot({
        name: 'mutation',
        kind: 'rootType',
        absPath: expect.any(String),
        children: {
          auth: {
            absPath: expect.any(String),
            children: {
              login: expect.objectContaining({ kind: 'file' }),
              logout: expect.objectContaining({ kind: 'file' }),
              nested: expect.objectContaining({ kind: 'dir' }),
            },
            namespaceConfig: expect.objectContaining({ kind: 'file' }),
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
