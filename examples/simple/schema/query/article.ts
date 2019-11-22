import { ArticleTC, getArticle } from '../../models/article';

export default {
  type: ArticleTC,
  args: {
    id: 'Int!',
  },
  resolve: (_, args) => getArticle(args.id),
};
