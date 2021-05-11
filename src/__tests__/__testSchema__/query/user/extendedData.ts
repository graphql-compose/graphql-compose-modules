import { FieldConfig } from '../../../../typeDefs';

export default {
  type: `
    type UserExtendedData {
      starsCount: Int
    }
  `,
  resolve: () => ({ starsCount: 10 }),
} as FieldConfig;
