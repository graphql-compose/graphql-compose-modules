import { FieldConfig } from '../../../typeDefs';

export default {
  type: `
    type SomeIndexFileType {
      awesomeValue: String
    }
  `,
  resolve: () => ({ awesomeValue: 'awesomeValue' }),
} as FieldConfig;
