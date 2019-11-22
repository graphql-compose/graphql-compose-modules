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
};
