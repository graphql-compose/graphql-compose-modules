import { FieldConfig } from '../../../typeDefs';

export default {
  type: (sc) => sc.get('Boolean'),
  resolve: () => true,
} as FieldConfig;
