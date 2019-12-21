import { ApolloServer } from 'apollo-server';
import { schema } from '../../src/__tests__/__testSchema__';

const server = new ApolloServer({
  schema,
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
