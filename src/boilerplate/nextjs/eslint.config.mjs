import boundaries from 'eslint-plugin-boundaries';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/typescript'),

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      boundaries,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: true,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/link',
              message:
                "Do not import Link from 'next/link'. Use Link from 'i18n/navigation' instead.",
            },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
    settings: {
      'boundaries/elements': [
        { type: 'feature', pattern: 'src/features/*/index.{ts,tsx}' },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
];

export default eslintConfig;
