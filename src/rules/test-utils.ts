import type { Linter as LinterTypes } from 'eslint'
import type { SlopRuleName } from '../types'
import { Linter } from 'eslint'
import plugin from '../plugin'

function config(ruleName: SlopRuleName, options: unknown[], parser?: LinterTypes.Parser): LinterTypes.Config {
  return {
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
  }
}

export function lint(
  ruleName: SlopRuleName,
  code: string,
  options: unknown[] = [],
  parser?: LinterTypes.Parser,
): LinterTypes.LintMessage[] {
  const linter = new Linter({ configType: 'flat' })
  return linter.verify(code, config(ruleName, options, parser), parser ? 'fixture.ts' : 'fixture.js')
}

export function lintFix(
  ruleName: SlopRuleName,
  code: string,
  options: unknown[] = [],
  parser?: LinterTypes.Parser,
): string {
  const linter = new Linter({ configType: 'flat' })
  return linter.verifyAndFix(code, config(ruleName, options, parser), parser ? 'fixture.ts' : 'fixture.js').output
}

export function applyFix(code: string, fix: { range: [number, number], text: string } | undefined): string {
  if (!fix)
    return code
  return code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1])
}
