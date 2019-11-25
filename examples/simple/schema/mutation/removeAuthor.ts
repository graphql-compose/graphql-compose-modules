import { AuthorTC, removeAuthor } from '../../models/author';

export default {
  type: AuthorTC,
  args: {
    id: 'Int!',
  },
  resolve: (_, args) => removeAuthor(args.id),
};
