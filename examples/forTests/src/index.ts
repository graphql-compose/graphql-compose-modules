import express from 'express';
import getGraphQLRouter from './graphql';

const app = express();

app.use(getGraphQLRouter());

app.use('/', (req, res) => {
  res.redirect('/graphql');
});

app.listen({ port: 4000 }, () => {
  console.log(`🚀 !!! Server ready at http://localhost:4000`);
});
