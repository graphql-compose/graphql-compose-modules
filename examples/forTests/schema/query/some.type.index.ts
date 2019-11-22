export default {
  type: `
    type SomeIndexFileType {
      awesomeValue: String
    }
  `,
  resolve: () => ({ awesomeValue: 'awesomeValue' }),
};
