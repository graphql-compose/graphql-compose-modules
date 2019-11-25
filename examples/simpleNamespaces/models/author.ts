import { schemaComposer } from 'graphql-compose';
import { ArticleTC, getArticles } from './article';
import _ from 'lodash';

export let authors = [
  { id: 1, name: 'User 1' },
  { id: 2, name: 'User 2' },
  { id: 3, name: 'User 3' },
];

export const AuthorTC = schemaComposer.createObjectTC(`
  type Author {
    id: Int
    name: String
  }
`);

AuthorTC.addFields({
  articles: {
    type: () => [ArticleTC],
    args: { page: 'Int', perPage: 'Int' },
    resolve: (source, args) =>
      getArticles({
        filter: { authorId: source.id },
        page: args.page,
        perPage: args.perPage,
      }),
  },
});

export function getAuthor(id: number) {
  return authors.find((r) => r.id === id);
}

export function getAuthors(opts: {
  page?: number;
  perPage?: number;
  filter?: Partial<typeof authors[0]>;
}) {
  const { page = 1, perPage = 10, filter } = opts;
  return _.filter(authors, filter).slice((page - 1) * perPage, page * perPage);
}

export function addAuthor(data: Partial<typeof authors[0]>): typeof authors[0] {
  if (!data.id) data.id = authors.reduce((c, { id: p }) => (c > p ? c : p), 0);
  authors.push(data as any);
  return data as any;
}

export function removeAuthor(id: number) {
  authors = authors.filter((d) => d.id !== id);
}
