module.exports = {
  env: {
    node: true,
    es6: true
  },
  parser: "babel-eslint",
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  rules: {
    "no-console": 0,
    "no-unused-vars": 0,
    "no-constant-condition": 0,
    quotes: ["error", "double"]
  }
};
