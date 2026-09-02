import type { Linter as LinterTypes } from 'eslint'
import type { SlopRuleName } from '../types'
import { Linter } from 'eslint'
import plugin from '../plugin'

export function lint(
  ruleName: SlopRuleName,
  code: string,
  options: unknown[] = [],
  parser?: LinterTypes.Parser,
): LinterTypes.LintMessage[] {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify(code, {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
      sourceType: 'module',
    },
    plugins: { slop: plugin },
    rules: {
      [`slop/${ruleName}`]: ['error', ...options],
    },
  }, parser ? 'fixture.ts' : 'fixture.js')
}
