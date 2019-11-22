import { schemaComposer } from 'graphql-compose';
import { authors, AuthorTC } from './author';
import _ from 'lodash';

export const articles = [
  { id: 1, title: 'Article 1', text: 'Text 1', authorId: 1 },
  { id: 2, title: 'Article 2', text: 'Text 2', authorId: 1 },
  { id: 3, title: 'Article 3', text: 'Text 3', authorId: 2 },
  { id: 4, title: 'Article 4', text: 'Text 4', authorId: 3 },
  { id: 5, title: 'Article 5', text: 'Text 5', authorId: 1 },
];

export const ArticleTC = schemaComposer.createObjectTC({
  name: 'Article',
  fields: {
    id: 'Int!',
    title: 'String',
    text: 'String',
    authorId: 'Int',
    author: {
      type: () => AuthorTC,
      resolve: (source) => authors.find((r) => source.authorId === r.id),
    },
  },
});

export function getArticle(id: number) {
  return articles.find((r) => r.id === id);
}

export function getArticles(opts: {
  page?: number;
  perPage?: number;
  filter?: Partial<typeof articles[0]>;
}) {
  const { page = 1, perPage = 10, filter } = opts;
  return _.filter(articles, filter).slice((page - 1) * perPage, page * perPage);
}

export function addArticle(data: Partial<typeof articles[0]>) {
  // if (!data.id) data.id = articles.reduce(({ id: c }, { id: p }) => (c > p ? c : p), 0);
}
