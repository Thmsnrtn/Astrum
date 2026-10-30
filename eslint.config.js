// One rule only: an identifier that is not defined anywhere. Five such
// references (renamed imports, a never-exported helper, a missing constant)
// once shipped silently because tests never reached them and try/catch
// swallowed the ReferenceError — this catches the whole class statically.
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**", "public/**", "src-tauri/**", "ios/**", "native/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: { "no-undef": "error" },
  },
];
