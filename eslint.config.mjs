/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import unicorn from 'eslint-plugin-unicorn';
import security from 'eslint-plugin-security';
import mocha from 'eslint-plugin-mocha';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...fixupConfigRules(
    compat.extends(
      'airbnb-base',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
      'prettier',
      'plugin:unicorn/recommended',
    ),
  ),
  {
    plugins: {
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      prettier,
      unicorn: fixupPluginRules(unicorn),
      security: fixupPluginRules(security),
      mocha,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 2018,
      sourceType: 'module',
    },

    rules: {
      'arrow-body-style': 'warn',
      'eol-last': 'off',
      'guard-for-in': 'off',
      'no-alert': 'warn',
      'no-async-promise-executor': 'off',
      'no-await-in-loop': 'off',
      'no-console': 'warn',
      'no-loop-func': 'off',
      'no-restricted-syntax': 'off',
      'no-shadow': 'off',
      'no-useless-constructor': 'off',
      'no-plusplus': 'off',
      'object-curly-newline': 'off',
      'prefer-destructuring': 'warn',
      radix: 'off',
      'require-await': 'warn',

      'spaced-comment': [
        'warn',
        'always',
        {
          exceptions: ['*'],
        },
      ],

      'no-continue': 'off',
      'no-promise-executor-return': 'off',
      'default-param-last': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-shadow': 'warn',
      'prettier/prettier': 'warn',
      'import/default': 'off',
      'import/extensions': 'off',
      'import/no-cycle': 'off',
      'import/order': 'warn',
      'import/prefer-default-export': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/expiring-todo-comments': 'off',

      'unicorn/filename-case': [
        'error',
        {
          case: 'camelCase',
        },
      ],

      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-fn-reference-in-iterator': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/no-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/number-literal-case': 'off',
      'unicorn/numeric-separators-style': 'off',
      'unicorn/prefer-set-has': 'off',
      'unicorn/prefer-spread': 'warn',
      'unicorn/prefer-object-from-entries': 'off',
      'unicorn/prefer-node-protocol': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/prefer-top-level-await': 'off',
      'unicorn/prefer-logical-operator-over-ternary': 'off',
      'unicorn/text-encoding-identifier-case': 'off',

      'unicorn/prevent-abbreviations': [
        'error',
        {
          replacements: {
            env: false,
          },
        },
      ],
    },
  },
  ...compat.extends('plugin:mocha/recommended').map((config) => ({
    ...config,
    files: ['tests/**/*.test.ts'],
  })),
  {
    files: ['tests/**/*.ts'],
    rules: {
      'mocha/no-mocha-arrows': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      'mocha/no-setup-in-describe': 'off',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-skipped-tests': 'error',
    },
  },
  {
    files: ['tests/setup.ts'],
    rules: {
      'no-unused-expressions': 'off',
    },
  },
];
