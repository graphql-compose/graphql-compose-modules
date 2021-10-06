import {
  ComposeNamedOutputType,
  ComposeOutputType,
  isTypeComposer,
  ObjectTypeComposer,
  SchemaComposer,
  unwrapOutputTC,
  upperFirst,
} from 'graphql-compose';
import {
  AstDirNode,
  AstFileNode,
  AstRootNode,
  AstRootTypeNode,
  RootTypeNames,
} from './directoryToAst';
import { FieldConfig } from './typeDefs';

interface VisitInfoData<TContext = any> {
  node: AstDirNode | AstFileNode | AstRootTypeNode;
  nodeParent: AstDirNode | AstRootTypeNode | AstRootNode;
  operation: RootTypeNames;
  fieldName: string;
  fieldPath: string[];
  schemaComposer: SchemaComposer<TContext>;
}

export class VisitInfo<TContext = any> {
  node: AstDirNode | AstFileNode | AstRootTypeNode;
  /** Parent AST node from directoryToAst */
  nodeParent: AstDirNode | AstRootTypeNode | AstRootNode;
  /** Brunch of schema under which is working visitor. Can be: query, mutation, subscription */
  operation: RootTypeNames;
  /** Name of field for current FieldConfig */
  fieldName: string;
  /** List of parent names starting from root */
  fieldPath: string[];
  /** Type registry */
  schemaComposer: SchemaComposer<TContext>;

  constructor(data: VisitInfoData<TContext>) {
    this.node = data.node;
    this.operation = data.operation;
    this.nodeParent = data.nodeParent;
    this.fieldName = data.fieldName;
    this.fieldPath = data.fieldPath;
    this.schemaComposer = data.schemaComposer;
  }

  /**
   * Check that this entrypoint belongs to Query
   */
  isQuery(): boolean {
    return this.operation === 'query';
  }

  /**
   * Check that this entrypoint belongs to Mutation
   */
  isMutation(): boolean {
    return this.operation === 'mutation';
  }

  /**
   * Check that this entrypoint belongs to Subscription
   */
  isSubscription(): boolean {
    return this.operation === 'subscription';
  }

  /**
   * Return array of fieldNames.
   * Dotted names will be automatically splitted.
   *
   * @example
   *   Assume:
   *     name: 'ping'
   *     path: ['query.storage', 'viewer', 'utils.debug']
   *   For empty options will be returned:
   *     ['storage', 'viewer', 'utils', 'debug', 'ping']
   *   For `{ includeOperation: true }` will be returned:
   *     ['query', 'storage', 'viewer', 'utils', 'debug', 'ping']
   */
  getFieldPathArray(opts?: { includeOperation?: boolean; omitFieldName?: boolean }): string[] {
    const res = [] as string[];
    this.fieldPath.forEach((e) => {
      if (e.indexOf('.')) {
        res.push(...e.split('.').filter(Boolean));
      } else {
        res.push(e);
      }
    });

    if (!opts?.omitFieldName) {
      res.push(this.fieldName);
    }

    return opts?.includeOperation ? res : res.slice(1);
  }

  /**
   * Return dotted path for current field
   */
  getFieldPathDotted(opts?: { includeOperation?: boolean; omitFieldName?: boolean }): string {
    return this.getFieldPathArray(opts).join('.');
  }

  /**
   * Return path as CamelCase string.
   *
   * Useful for getting type name according to path
   */
  getFieldPathCamelCase(opts?: { includeOperation?: boolean; omitFieldName?: boolean }): string {
    return this.getFieldPathArray(opts)
      .map((s) => upperFirst(s))
      .join('');
  }

  /**
   * Get FieldConfig for file or dir.
   * This is mutable object and is shared between all calls.
   */
  get fieldConfig(): FieldConfig {
    if (this.node.kind === 'file') {
      return this.node.code?.default as FieldConfig;
    } else if (this.node.kind === 'dir' || this.node.kind === 'rootType') {
      return this.node.namespaceConfig?.code?.default as FieldConfig;
    }
    throw new Error(
      `Cannot get fieldConfig. Node has some strange kind: ${(this.node as any).kind}`
    );
  }

  /**
   * Get TypeComposer instance for output type (object, scalar, enum, interface, union).
   * It's mutable object.
   */
  getOutputAnyTC(): ComposeOutputType<TContext> {
    const fc = this.fieldConfig;
    const outputType = fc.type;
    if (!outputType) {
      throw new Error(`FieldConfig ${this.getFieldPathDotted()} does not have 'type' property`);
    }

    // if the type is of any kind of TypeComposer
    // then return it directly
    // or try to convert it to TypeComposer and save in FieldConfig as prepared type
    if (isTypeComposer(outputType)) {
      return outputType;
    } else {
      const outputTC = this.schemaComposer.typeMapper.convertOutputTypeDefinition(
        outputType,
        this.fieldName,
        this.nodeParent?.name
      );

      if (!outputTC) {
        throw new Error(
          `FieldConfig ${this.getFieldPathDotted()} contains some strange value as output type`
        );
      }

      fc.type = outputTC;
      return outputTC;
    }
  }

  /**
   * Check that output type is an object
   */
  isOutputTypeIsObject(): boolean {
    return this.getOutputAnyTC() instanceof ObjectTypeComposer;
  }

  /**
   * Get TypeComposer instance for output type (object, scalar, enum, interface, union).
   * It's mutable object.
   */
  getOutputUnwrappedTC(): ComposeNamedOutputType<TContext> {
    return unwrapOutputTC(this.getOutputAnyTC());
  }

  /**
   * Get TypeComposer instance for output type (object, scalar, enum, interface, union).
   * It's mutable object.
   */
  getOutputUnwrappedOTC(): ObjectTypeComposer {
    const tc = unwrapOutputTC(this.getOutputAnyTC());

    if (!(tc instanceof ObjectTypeComposer)) {
      throw new Error(
        `FieldConfig ${this.getFieldPathDotted()} has non-Object output type. Use 'isOutputTypeIsObject()' before for avoiding this error.`
      );
    }

    return tc;
  }

  toString(): string {
    return `VisitInfo(${this.getFieldPathDotted({ includeOperation: true })})`;
  }

  toJSON(): string {
    return this.toString();
  }
}
