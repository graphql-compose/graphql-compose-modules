import { ArticleTC, removeArticle } from '../../models/article';

export default {
  type: ArticleTC,
  args: {
    id: 'Int!',
  },
  resolve: (_, args) => removeArticle(args.id),
};
