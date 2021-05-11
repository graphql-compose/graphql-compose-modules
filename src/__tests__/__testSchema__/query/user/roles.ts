import { FieldConfig } from '../../../../typeDefs';

export default {
  type: ['String'],
  resolve: () => ['ADMIN', 'USER'],
} as FieldConfig;
