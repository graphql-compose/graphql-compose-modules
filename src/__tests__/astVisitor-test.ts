import { astVisitor, VISITOR_REMOVE_NODE, VISITOR_SKIP_CHILDREN } from '../astVisitor';
import { directoryToAst, AstRootNode } from '../directoryToAst';
import { astToSchema } from '../astToSchema';
import { graphql } from 'graphql';

describe('astVisitor', () => {
  let ast: AstRootNode;

  beforeEach(() => {
    ast = directoryToAst(module, { relativePath: './__testSchema__' });
  });

  it('should visit all ROOT_TYPEs', () => {
    const names: string[] = [];
    astVisitor(ast, {
      ROOT_TYPE: (node, info) => {
        names.push(info.name);
        expect(info.parent).toBe(ast);
      },
    });
    expect(names.sort()).toEqual(['query', 'mutation'].sort());
  });

  it('should visit all DIRs', () => {
    const dirs: string[] = [];
    astVisitor(ast, {
      DIR: (node, info) => {
        dirs.push(`${info.path.join('.')}.${info.name}`);
      },
    });
    expect(dirs.sort()).toEqual(
      [
        'mutation.auth',
        'mutation.auth.nested',
        'mutation.logs.nested',
        'mutation.user',
        'query.auth',
        'query.auth.nested',
        'query.me',
        'query.user',
      ].sort()
    );
  });

  it('should visit all FILEs', () => {
    const files: string[] = [];
    astVisitor(ast, {
      FILE: (node, info) => {
        files.push(`${info.path.join('.')}.${info.name}`);
      },
    });
    expect(files.sort()).toEqual(
      [
        'mutation.auth.login',
        'mutation.auth.logout',
        'mutation.auth.nested.method',
        'mutation.logs.nested.list',
        'mutation.user.create',
        'mutation.user.update',
        'query.auth.isLoggedIn',
        'query.auth.nested.method',
        'query.field',
        'query.me.address.city',
        'query.me.address.street',
        'query.me.name',
        'query.some.index',
        'query.some.nested',
        'query.user.extendedData',
        'query.user.roles',
      ].sort()
    );
  });

  it('`null` should remove nodes from ast', () => {
    astVisitor(ast, {
      DIR: () => {
        return VISITOR_REMOVE_NODE;
      },
      FILE: () => {
        return VISITOR_REMOVE_NODE;
      },
    });
    expect(ast.children.query?.children).toEqual({});
  });

  it('`false` should not traverse children', () => {
    const files: string[] = [];
    astVisitor(ast, {
      ROOT_TYPE: (node, info) => {
        // skip all from `query`
        if (info.name === 'query') return VISITOR_SKIP_CHILDREN;
      },
      DIR: (node, info) => {
        // skip all except `auth` dir
        if (info.name !== 'auth') return VISITOR_SKIP_CHILDREN;
      },
      FILE: (node, info) => {
        files.push(`${info.path.join('.')}.${info.name}`);
      },
    });
    expect(files.sort()).toEqual(['mutation.auth.login', 'mutation.auth.logout'].sort());
  });

  it('`any_node` should replace current node', () => {
    astVisitor(ast, {
      ROOT_TYPE: () => {
        return { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' };
      },
    });

    expect(ast.children).toEqual({
      mutation: { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' },
      query: { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' },
    });
  });

  it('try to wrap all mutations', async () => {
    const logs: any[] = [];
    astVisitor(ast, {
      ROOT_TYPE: (node) => {
        if (node.name !== 'mutation') {
          return VISITOR_SKIP_CHILDREN;
        }
      },
      FILE: (node) => {
        const currentResolve = node.code.default.resolve;
        if (currentResolve) {
          const description = node.code.default.description;
          node.code.default.resolve = (s: any, a: any, c: any, i: any) => {
            logs.push({
              description,
              args: a,
            });
            return currentResolve(s, a, c, i);
          };
        }
      },
    });
    const schema = astToSchema(ast).buildSchema();
    const result = await graphql(
      schema,
      `
        mutation {
          auth {
            login(email: "a@b.c", password: "123")
          }
        }
      `
    );
    expect(result).toEqual({ data: { auth: { login: true } } });
    expect(logs).toEqual([
      {
        description: 'Login operation',
        args: { email: 'a@b.c', password: '123' },
      },
    ]);
  });
});
