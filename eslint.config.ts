import antfu from '@antfu/eslint-config'
import { createSlopConfig } from './src'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
  },
  createSlopConfig(),
  {
    files: [
      '**/*.md',
      '**/*.md/**/*.*',
    ],
    rules: {
      'slop/no-trivial-type-aliases': 'off',
      'slop/no-em-dash': 'off',
      'slop/no-chained-type-assertions': 'off',
      'slop/no-trivial-functions': 'off',
      'slop/no-jargon': 'off',
      'slop/prefer-jsdoc': 'off',
    },
  },
)
