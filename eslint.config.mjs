// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
    },
    rules: {
      // Enforce consistent indentation (2 spaces)
      'indent': ['error', 2],

      // Enforce the use of double quotes for strings
      'quotes': ['error', 'double', { 'avoidEscape': true }],

      // Enforce semicolons at the end of statements
      'semi': ['error', 'always'],

      // Require the use of === and !== (no implicit type conversions)
      'eqeqeq': ['error', 'always'],

      // Enforce consistent line breaks
      'linebreak-style': ['error', 'unix'],

      // Enforce a maximum line length (100 characters)
      'max-len': ['error', { 'code': 100 }],

      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-empty-interface': 'warn',

      // Disable rules that conflict with TypeScript or cause issues
      'no-undef': 'off', // TypeScript handles this
    },
  },
);
