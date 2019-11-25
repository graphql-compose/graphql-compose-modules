import { getAuthors, AuthorTC } from '../../../models/author';

export default {
  type: [AuthorTC],
  args: {
    page: 'Int',
    perPage: { type: 'Int', defaultValue: 3 },
  },
  resolve: (_, args) => getAuthors({ page: args.page, perPage: args.perPage }),
};
