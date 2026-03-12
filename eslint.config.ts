import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ─── IGNORED PATHS ────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // ─── BASE ─────────────────────────────────────────────────────────────────
  js.configs.recommended,

  // ─── TYPESCRIPT ───────────────────────────────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', '*.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ─── UNICORN ──────────────────────────────────────────────────────────────
  {
    plugins: { unicorn },
    rules: {
      ...unicorn.configs.recommended.rules,
      'unicorn/no-process-exit': 'off', // CLI tools legitimately call process.exit
      'unicorn/prevent-abbreviations': 'off', // too noisy for internal tooling
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-module': 'off', // already ESM; conflicts with some patterns
    },
  },

  // ─── IMPORTS ──────────────────────────────────────────────────────────────
  {
    plugins: { 'import-x': importX, 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-cycle': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-self-import': 'error',
    },
  },

  // ─── CUSTOM RULES ─────────────────────────────────────────────────────────
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // ─── PRETTIER (must be last) ───────────────────────────────────────────────
  prettier,
);
