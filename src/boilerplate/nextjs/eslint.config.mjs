import nextConfig from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextConfig,

  {
    files: ['src/**/*.{ts,tsx}'],
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
  },
];

export default eslintConfig;
