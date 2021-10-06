import { FieldConfig } from 'graphql-compose-modules';
import { AuthorTC, getAuthor } from '../../models/author';

export default {
  type: AuthorTC,
  args: {
    id: 'Int!',
  },
  resolve: (_, args) => getAuthor(args.id),
} as FieldConfig;
