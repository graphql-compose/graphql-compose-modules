import { FieldConfig } from '../../../typeDefs';

export default {
  type: 'Boolean',
  description: 'Login operation',
  args: { email: 'String', password: 'String' },
  resolve: () => true,
} as FieldConfig;
