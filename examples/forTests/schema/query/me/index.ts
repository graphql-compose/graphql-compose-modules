export default {
  type: 'MeType',
  args: {},
  resolve: (_, __, context) => {
    if (!context.isAdmin) throw new Error('You should be the ADMIN');
    return {};
  },
};
