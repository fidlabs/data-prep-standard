import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import node from "eslint-plugin-n";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginJest from "eslint-plugin-jest";

export default defineConfig([
  { files: ["**/*.{js,ts}"], languageOptions: { globals: globals.node } },
  {
    linterOptions: {
      reportUnusedInlineConfigs: "error",
    },
    rules: {
      "no-unused-vars": ["error"],
      "max-len": ["error", { "code": 120 }],
    }
  },
  node.configs["flat/recommended-module"],
  {
    files: ["**/*.{js,ts}"],
    "languageOptions" : {
      "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": "latest"
      },
    },
    "rules": {
      "n/exports-style": ["error", "module.exports"],
      "n/file-extension-in-import": ["error", "always"],
      "n/handle-callback-err": ["error"],
      "n/no-callback-literal": ["error"],
      "n/no-new-require": ["error"],
      "n/no-missing-import": ["error",{ "tryExtensions": [".tsx", ".ts", ".js"] }],
      "n/no-mixed-requires": ["error"],
      "n/no-path-concat": ["error"],
      "n/no-process-env": ["error"],
      "n/no-sync": ["off"],
      "n/no-top-level-await": ["error"], // use this for modules
      "n/prefer-node-protocol": ["error"],
      "n/hashbang": "off"
    }
  },
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  {
    rules:
    {
      "prefer-const": "error",
      "prefer-destructuring": [
            "error",
            {
                array: true,
                object: true
            }
        ],
    }
  },
  tseslint.config(
    {
      ignores: [
        'dist/**/*.ts',
        'dist/**',
        "**/*.mjs",
        "eslint.config.mjs",
        "**/*.js"
      ]
    }
  ),
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    ...pluginJest.configs['flat/style'],
  },
  tseslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);
