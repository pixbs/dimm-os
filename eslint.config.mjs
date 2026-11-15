import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    // One navigation by the Next.js router would remount the desk and close every window.
    files: ['src/shell/**', 'src/system/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next/link', message: 'The desk owns navigation: use a plain link.' },
            {
              name: 'next/form',
              message: 'The desk owns navigation: write with fetch to a route handler.',
            },
            {
              name: 'next/navigation',
              importNames: ['useRouter', 'redirect', 'permanentRedirect'],
              message: 'The desk owns navigation: use a plain link or the History API.',
            },
            {
              name: 'next/router',
              importNames: ['useRouter'],
              message: 'The desk owns navigation: use a plain link or the History API.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ExpressionStatement[directive='use server']",
          message: 'No Server Actions where the desk lives: write with fetch to a route handler.',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
