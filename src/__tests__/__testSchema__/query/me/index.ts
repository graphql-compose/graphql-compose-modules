export default {
  args: {
    arg: 'Int',
  },
  resolve: (_: any, __: any, context: any) => {
    if (!context?.isAdmin) throw new Error('You should be the ADMIN');
    return {};
  },
};
