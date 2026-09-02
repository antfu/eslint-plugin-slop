import type { ESLint } from 'eslint'
import { rules } from './rules'

const plugin: ESLint.Plugin = {
  meta: {
    name: 'eslint-plugin-slop',
    version: '0.0.0',
  },
  rules,
}

export default plugin
