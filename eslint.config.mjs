import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  security.configs.recommended,
  {
    rules: {
      // Strict security rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-octal-escape": "error",
      "no-proto": "error",
      "no-caller": "error",
      "no-extend-native": "error",
      "no-inline-comments": "off",
      // Promote security plugin warns to errors in CI/build
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-non-literal-require": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "reference/**",
  ]),
]);

export default eslintConfig;
