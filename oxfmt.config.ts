import type { OxfmtConfig } from 'oxfmt'

export default {
  // Generated files stay as Payload writes them, and the rule scripts keep their own style.
  ignorePatterns: [
    '**/payload-types.ts',
    'src/app/(payload)/admin/importMap.js',
    'src/migrations/**',
    'tsconfig.json',
    '.claude/**',
    'scripts/**',
  ],
  printWidth: 100,
  semi: false,
  singleQuote: true,
  sortPackageJson: false,
  trailingComma: 'all',
} satisfies OxfmtConfig
