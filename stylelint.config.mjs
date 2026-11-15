// A raw value lives in the tokens and nowhere else.
const config = {
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      [
        '/color$/',
        'fill',
        'stroke',
        '/^background/',
        '/^border/',
        '/^outline/',
        '/^font/',
        'line-height',
        'letter-spacing',
        'word-spacing',
        '/^margin/',
        '/^padding/',
        '/gap$/',
        '/width$/',
        '/height$/',
        'box-shadow',
        'opacity',
        'z-index',
        '/^transition/',
        '/^animation/',
        '/^--/',
      ],
      {
        expandShorthand: true,
        ignoreValues: ['/^(0|auto|none|inherit|transparent|currentColor|solid|inset|100%)$/'],
      },
    ],
    // What the rule above lets through inside a function.
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
    ],
    'unit-disallowed-list': ['px', 'em', 'rem', 'ms', 's'],
  },
  overrides: [
    {
      files: ['src/ds/atoms/tokens.css'],
      rules: {
        'scale-unlimited/declaration-strict-value': null,
        'color-no-hex': null,
        'unit-disallowed-list': null,
      },
    },
  ],
}

export default config
