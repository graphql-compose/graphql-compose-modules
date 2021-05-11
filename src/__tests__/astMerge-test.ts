import { astMerge } from '../astMerge';
import { directoryToAst, AstRootNode } from '../directoryToAst';
import { astToSchema } from '../astToSchema';

describe('astMerge', () => {
  let ast1: AstRootNode;
  let ast2: AstRootNode;

  beforeEach(() => {
    ast1 = directoryToAst(module, { relativePath: './__fixtures__/merge/schema1' });
    ast2 = directoryToAst(module, { relativePath: './__fixtures__/merge/schema2' });
  });

  it('should merge two schemas', () => {
    const mergedAst = astMerge(ast1, ast2);
    const schema = astToSchema(mergedAst);

    expect(schema.toSDL()).toMatchInlineSnapshot(`
      "type Query {
        \\"\\"\\"B.query.me\\"\\"\\"
        me: String
        tasks: QueryTasks
      }

      type Mutation {
        \\"\\"\\"A.mutation.createTask\\"\\"\\"
        createTask: String
      }

      type Subscription {
        \\"\\"\\"B.subscription.events\\"\\"\\"
        events: String
      }

      \\"\\"\\"
      The \`String\` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.
      \\"\\"\\"
      scalar String

      type QueryTasks {
        \\"\\"\\"B.query.tasks.byId\\"\\"\\"
        byId: String

        \\"\\"\\"A.query.tasks.list\\"\\"\\"
        list: String

        \\"\\"\\"B.query.tasks.byIds\\"\\"\\"
        byIds: String
      }"
    `);
  });
});
