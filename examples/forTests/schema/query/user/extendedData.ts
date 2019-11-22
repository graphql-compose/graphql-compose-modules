export default {
  type: `
    type UserExtendedData {
      starsCount: Int
    }
  `,
  resolve: () => ({ starsCount: 10 }),
};
