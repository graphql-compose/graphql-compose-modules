import { NamespaceConfig } from '../../../../typeDefs';

export default {
  type: `
    type UserAwesomeType {
      firstName: String
      lastName: String
    }
  `,
  args: {},
  resolve: () => {
    return {
      firstName: 'Awesome',
      lastName: 'User',
    };
  },
} as NamespaceConfig;
