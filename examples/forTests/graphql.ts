/* eslint-disable @typescript-eslint/camelcase */
import express from 'express';
import path from 'path';
import { ApolloServer } from 'apollo-server-express';
import { requireSchemaDirectory } from '../../src/requireSchemaDirectory';
import { requireToSchema } from '../../src/requireToSchema';

const ast = requireSchemaDirectory(module, path.resolve(__dirname, './schema'));
const sc = requireToSchema(ast);
const schema = sc.buildSchema();

export default function getGraphQLRouter() {
  const router = express.Router();

  const server = new ApolloServer({
    schema,
    context: async ({
      req,
      res,
    }: {
      req: express.Request;
      res: express.Response;
    }): Promise<any> => {
      return {
        req,
        res,
      };
    },
    introspection: true,
    formatError: (error) => {
      return error;
    },
  });

  const whitelist = ['http://localhost:4000'];
  server.applyMiddleware({
    app: router as any,
    path: '/graphql',
    cors: {
      credentials: true,
      allowedHeaders: ['Content-Type', 'Cookie', 'Origin', 'X-Requested-With', 'Accept'],
      methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
      origin: (origin: string | undefined, callback: any) => {
        if (typeof origin === 'undefined') {
          callback(null);
        } else if (whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null);
        }
      },
    },
  });

  return router;
}
