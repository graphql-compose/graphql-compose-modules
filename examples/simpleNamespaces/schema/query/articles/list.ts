import { getArticles, ArticleTC } from '../../../models/article';

export default {
  type: [ArticleTC],
  args: {
    page: 'Int',
    perPage: { type: 'Int', defaultValue: 3 },
  },
  resolve: (_, args) => getArticles({ page: args.page, perPage: args.perPage }),
};
