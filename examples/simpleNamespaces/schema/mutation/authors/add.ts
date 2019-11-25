import { AuthorTC, addAuthor } from '../../../models/author';

export default {
  type: AuthorTC,
  args: {
    name: 'String!',
  },
  resolve: (_, args) => addAuthor(args),
};
