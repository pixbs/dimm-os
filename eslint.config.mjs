import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// Motion is loaded lazily: an import of the whole of it would bring it back before first paint.
const whole = 'Motion is loaded lazily: use the m components of motion/react-m.'
const motion = [
  { name: 'motion/react', importNames: ['motion'], message: whole },
  { name: 'motion/react-client', message: whole },
  { name: 'framer-motion', message: whole },
]

// A thing that goes from one place to another is one element that travels, which only the motion vocabulary moves.
const reads = /^get(BoundingClientRect|ClientRects)$/
const writes =
  /\b(transform|translate|scale)\b|\.animate\(|\.style\.(left|top|right|bottom|inset)|\b(left|top|right|bottom|inset): /
const moves = {
  rules: {
    'by-hand': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          made: 'A move made by hand: this reads the box of an element where a transform or a place is written. Use Travels of src/ds/motion.',
        },
      },
      create: (context) => ({
        CallExpression(node) {
          if (!reads.test(node.callee.property?.name)) return
          const within = context.sourceCode
            .getAncestors(node)
            .findLast((one) => /Function/.test(one.type))
          if (within && writes.test(context.sourceCode.getText(within)))
            context.report({ node, messageId: 'made' })
        },
      }),
    },
  },
}

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
      'no-restricted-imports': ['error', { paths: motion }],
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
            ...motion,
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
    files: ['src/**'],
    ignores: ['src/ds/motion/**'],
    plugins: { moves },
    rules: { 'moves/by-hand': 'error' },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
