import { NamespaceConfig } from '../../../../typeDefs';

export default {
  args: {
    arg: 'Int',
  },
  resolve: (_, __, context) => {
    if (!context?.isAdmin) throw new Error('You should be the ADMIN');
    return {};
  },
} as NamespaceConfig;
