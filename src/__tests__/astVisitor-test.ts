import { astVisitor, VISITOR_REMOVE_NODE, VISITOR_SKIP_CHILDREN } from '../astVisitor';
import { directoryToAst, AstRootNode } from '../directoryToAst';
import { astToSchema } from '../astToSchema';
import { graphql } from 'graphql';
import sortBy from 'lodash.sortby';
import { SchemaComposer } from 'graphql-compose';

describe('astVisitor', () => {
  let ast: AstRootNode;
  const schemaComposer = new SchemaComposer();

  beforeEach(() => {
    ast = directoryToAst(module, { rootDir: './__testSchema__' });
    schemaComposer.clear();
  });

  it('should visit all ROOT_TYPEs', () => {
    const names: string[] = [];
    astVisitor(ast, schemaComposer, {
      ROOT_TYPE: (info) => {
        names.push(info.fieldName);
        expect(info.nodeParent).toBe(ast);
      },
    });
    expect(names.sort()).toEqual(['query', 'mutation'].sort());
  });

  it('should visit all DIRs', () => {
    const dirs: string[] = [];
    astVisitor(ast, schemaComposer, {
      DIR: (info) => {
        dirs.push(`${info.fieldPath.join('.')}.${info.fieldName}`);
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
    astVisitor(ast, schemaComposer, {
      FILE: (info) => {
        files.push(`${info.fieldPath.join('.')}.${info.fieldName}`);
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
    astVisitor(ast, schemaComposer, {
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
    astVisitor(ast, schemaComposer, {
      ROOT_TYPE: (info) => {
        // skip all from `query`
        if (info.isQuery()) return VISITOR_SKIP_CHILDREN;
      },
      DIR: (info) => {
        // skip all except `auth` dir
        if (info.fieldName !== 'auth') return VISITOR_SKIP_CHILDREN;
      },
      FILE: (info) => {
        files.push(`${info.fieldPath.join('.')}.${info.fieldName}`);
      },
    });
    expect(files.sort()).toEqual(['mutation.auth.login', 'mutation.auth.logout'].sort());
  });

  it('`any_node` should replace current node', () => {
    astVisitor(ast, schemaComposer, {
      ROOT_TYPE: () => {
        return { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' };
      },
    });

    expect(ast.children).toEqual({
      mutation: { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' },
      query: { absPath: '', children: {}, kind: 'rootType', name: 'MOCK' },
    });
  });

  describe('visitFn should have path & operation & name properties', () => {
    it('check ROOT_TYPE', () => {
      const nodes = [] as Array<any>;
      astVisitor(ast, schemaComposer, {
        ROOT_TYPE: (info) => {
          nodes.push({ operation: info.operation, name: info.fieldName, path: info.fieldPath });
        },
      });
      expect(sortBy(nodes, ['operation', 'name'])).toEqual([
        { name: 'mutation', operation: 'mutation', path: [] },
        { name: 'query', operation: 'query', path: [] },
      ]);
    });

    it('check DIR & FILE elements', () => {
      const nodes = [] as Array<any>;
      astVisitor(ast, schemaComposer, {
        DIR: (info) => {
          nodes.push({ operation: info.operation, name: info.fieldName, path: info.fieldPath });
        },
        FILE: (info) => {
          nodes.push({ operation: info.operation, name: info.fieldName, path: info.fieldPath });
        },
      });
      expect(sortBy(nodes, ['operation', 'name'])).toEqual([
        { operation: 'mutation', name: 'auth', path: ['mutation'] },
        { operation: 'mutation', name: 'create', path: ['mutation', 'user'] },
        { operation: 'mutation', name: 'list', path: ['mutation', 'logs', 'nested'] },
        { operation: 'mutation', name: 'login', path: ['mutation', 'auth'] },
        { operation: 'mutation', name: 'logout', path: ['mutation', 'auth'] },
        { operation: 'mutation', name: 'method', path: ['mutation', 'auth', 'nested'] },
        { operation: 'mutation', name: 'nested', path: ['mutation', 'logs'] },
        { operation: 'mutation', name: 'nested', path: ['mutation', 'auth'] },
        { operation: 'mutation', name: 'update', path: ['mutation', 'user'] },
        { operation: 'mutation', name: 'user', path: ['mutation'] },
        { operation: 'query', name: 'auth', path: ['query'] },
        { operation: 'query', name: 'city', path: ['query', 'me', 'address'] },
        { operation: 'query', name: 'extendedData', path: ['query', 'user'] },
        { operation: 'query', name: 'field', path: ['query'] },
        { operation: 'query', name: 'index', path: ['query', 'some'] },
        { operation: 'query', name: 'isLoggedIn', path: ['query', 'auth'] },
        { operation: 'query', name: 'me', path: ['query'] },
        { operation: 'query', name: 'method', path: ['query', 'auth', 'nested'] },
        { operation: 'query', name: 'name', path: ['query', 'me'] },
        { operation: 'query', name: 'nested', path: ['query', 'some'] },
        { operation: 'query', name: 'nested', path: ['query', 'auth'] },
        { operation: 'query', name: 'roles', path: ['query', 'user'] },
        { operation: 'query', name: 'street', path: ['query', 'me', 'address'] },
        { operation: 'query', name: 'user', path: ['query'] },
      ]);
    });
  });

  it('try to wrap all mutations', async () => {
    const logs: any[] = [];
    astVisitor(ast, schemaComposer, {
      ROOT_TYPE: (node) => {
        if (!node.isMutation()) {
          return VISITOR_SKIP_CHILDREN;
        }
      },
      FILE: (node) => {
        const currentResolve = node.fieldConfig?.resolve;
        if (currentResolve) {
          const description = node.fieldConfig?.description;
          node.fieldConfig.resolve = (s: any, a: any, c: any, i: any) => {
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
