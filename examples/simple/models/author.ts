import { schemaComposer } from 'graphql-compose';
import { ArticleTC, getArticles } from './article';

export const authors = [
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
    resolve: (source) => getArticles({ filter: { authorId: source.id } }),
  },
});

export function getAuthor(id: number) {
  return authors.find((r) => r.id === id);
}

export function getAuthors(opts: { page?: number; perPage?: number }) {
  const { page = 1, perPage = 10 } = opts;
  return authors.slice((page - 1) * perPage, page * perPage);
}
