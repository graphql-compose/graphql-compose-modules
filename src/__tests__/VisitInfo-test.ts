import {
  ListComposer,
  ObjectTypeComposer,
  ScalarTypeComposer,
  SchemaComposer,
} from 'graphql-compose';
import { AstFileNode, AstRootNode, VisitInfo } from '..';

const schemaComposer = new SchemaComposer();
const nodeParent = {
  absPath: 'schema/query',
  children: {},
  kind: 'root',
  name: 'query',
} as AstRootNode;
const node = {
  absPath: 'schema/query/some_endpoint.ts',
  code: {
    default: {
      type: 'String',
      resolve: () => 'Hello!',
    },
  },
  kind: 'file',
  name: 'some_endpoint',
} as AstFileNode;

beforeEach(() => {
  schemaComposer.clear();
});

describe('VisitInfo', () => {
  it('getFieldPathArray()', () => {
    const info = new VisitInfo({
      operation: 'query',
      fieldName: 'ping',
      fieldPath: ['query.storage', 'viewer', 'utils.debug'],
      node,
      nodeParent,
      schemaComposer,
    });

    expect(info.getFieldPathArray()).toEqual(['storage', 'viewer', 'utils', 'debug', 'ping']);
    expect(info.getFieldPathArray({ omitFieldName: true })).toEqual([
      'storage',
      'viewer',
      'utils',
      'debug',
    ]);
    expect(info.getFieldPathArray({ includeOperation: true })).toEqual([
      'query',
      'storage',
      'viewer',
      'utils',
      'debug',
      'ping',
    ]);

    const info2 = new VisitInfo({
      operation: 'query',
      fieldName: 'namespace.ping',
      fieldPath: ['query.storage'],
      node,
      nodeParent,
      schemaComposer,
    });
    expect(info2.getFieldPathArray()).toEqual(['storage', 'namespace', 'ping']);
    expect(info2.getFieldPathArray({ omitFieldName: true })).toEqual(['storage', 'namespace']);
  });

  it('getFieldPathDotted()', () => {
    const info = new VisitInfo({
      operation: 'query',
      fieldName: 'ping',
      fieldPath: ['query.storage', 'viewer', 'utils.debug'],
      node,
      nodeParent,
      schemaComposer,
    });

    expect(info.getFieldPathDotted()).toEqual('storage.viewer.utils.debug.ping');
    expect(info.getFieldPathDotted({ omitFieldName: true })).toEqual('storage.viewer.utils.debug');
    expect(info.getFieldPathDotted({ includeOperation: true })).toEqual(
      'query.storage.viewer.utils.debug.ping'
    );
  });

  it('getFieldPathCamelCase()', () => {
    const info = new VisitInfo({
      operation: 'query',
      fieldName: 'ping',
      fieldPath: ['query.storage', 'viewer', 'utils.debug'],
      node,
      nodeParent,
      schemaComposer,
    });

    expect(info.getFieldPathCamelCase()).toEqual('StorageViewerUtilsDebugPing');
    expect(info.getFieldPathCamelCase({ omitFieldName: true })).toEqual('StorageViewerUtilsDebug');
    expect(info.getFieldPathCamelCase({ includeOperation: true })).toEqual(
      'QueryStorageViewerUtilsDebugPing'
    );
  });

  it('get fieldConfig', () => {
    const info = new VisitInfo({
      operation: 'query',
      fieldName: 'ping',
      fieldPath: ['query.storage', 'viewer', 'utils.debug'],
      node,
      nodeParent,
      schemaComposer,
    });

    const { fieldConfig } = info;
    expect(fieldConfig).toEqual({ resolve: expect.anything(), type: 'String' });
  });

  describe('methods for output type', () => {
    const info = new VisitInfo({
      operation: 'query',
      fieldName: 'ping',
      fieldPath: ['query.storage', 'viewer', 'utils.debug'],
      node,
      nodeParent,
      schemaComposer,
    });

    it('getOutputAnyTC() with Scalar', () => {
      const tc = info.getOutputAnyTC();
      expect(tc instanceof ScalarTypeComposer).toBeTruthy();
      expect(tc.getTypeName()).toEqual('String');
    });

    it('getOutputAnyTC() with List', () => {
      info.fieldConfig.type = '[String!]';
      const tc = info.getOutputAnyTC();
      expect(tc instanceof ListComposer).toBeTruthy();
      expect(tc.getTypeName()).toEqual('[String!]');
    });

    it('isOutputTypeIsObject()', () => {
      info.fieldConfig.type = 'String';
      expect(info.isOutputTypeIsObject()).toBeFalsy();
      info.fieldConfig.type = '[String!]';
      expect(info.isOutputTypeIsObject()).toBeFalsy();
      info.fieldConfig.type = 'type MyObj { a: Int }';
      expect(info.isOutputTypeIsObject()).toBeTruthy();
    });

    it('getOutputUnwrappedTC()', () => {
      info.fieldConfig.type = 'String';
      expect(info.getOutputUnwrappedTC() instanceof ScalarTypeComposer).toBeTruthy();
      expect(info.getOutputUnwrappedTC().getTypeName()).toBe('String');
      info.fieldConfig.type = '[String!]';
      expect(info.getOutputUnwrappedTC() instanceof ScalarTypeComposer).toBeTruthy();
      expect(info.getOutputUnwrappedTC().getTypeName()).toBe('String');
      info.fieldConfig.type = ['type MyObj { a: Int }'];
      expect(info.getOutputUnwrappedTC() instanceof ObjectTypeComposer).toBeTruthy();
      expect(info.getOutputUnwrappedTC().getTypeName()).toBe('MyObj');
    });

    it('getOutputUnwrappedTC()', () => {
      info.fieldConfig.type = 'String';
      expect(() => info.getOutputUnwrappedOTC()).toThrowError(/has non-Object output type/);

      info.fieldConfig.type = ['type MyObj { a: Int }'];
      expect(info.getOutputUnwrappedOTC() instanceof ObjectTypeComposer).toBeTruthy();
      expect(info.getOutputUnwrappedOTC().getTypeName()).toBe('MyObj');
    });
  });
});
