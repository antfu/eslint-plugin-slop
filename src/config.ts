import type { Linter } from 'eslint'
import type { SlopConfigOptions, SlopRuleId, SlopSettings } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import plugin from './plugin'
import { normalizeInspection } from './utils/inspection'

const universalRuleIds = ['slop/no-em-dash'] as const satisfies readonly SlopRuleId[]
const javascriptRuleIds = [
  'slop/max-comment-length',
  'slop/no-chained-type-assertions',
  'slop/no-jargon',
  'slop/no-trivial-functions',
  'slop/no-trivial-type-aliases',
  'slop/prefer-jsdoc',
] as const satisfies readonly SlopRuleId[]

const defaultRules: Record<SlopRuleId, Linter.RuleEntry> = {
  'slop/max-comment-length': 'error',
  'slop/no-chained-type-assertions': 'error',
  'slop/no-em-dash': 'error',
  'slop/no-jargon': 'error',
  'slop/no-trivial-functions': 'error',
  'slop/no-trivial-type-aliases': 'error',
  'slop/prefer-jsdoc': 'error',
}

function selectRules(
  ruleIds: readonly SlopRuleId[],
  configuredRules: Record<SlopRuleId, Linter.RuleEntry>,
): Linter.RulesRecord {
  return Object.fromEntries(ruleIds.map(ruleId => [ruleId, configuredRules[ruleId]]))
}

export function createSlopConfig(options: SlopConfigOptions = {}): Linter.Config[] {
  const settings: SlopSettings = {
    cwd: resolve(options.cwd ?? process.cwd()),
    inspection: normalizeInspection(options.inspection),
  }
  const configuredRules = { ...defaultRules, ...options.rules }

  return [
    {
      name: 'slop/universal',
      plugins: { slop: plugin },
      settings: { slop: settings },
      rules: selectRules(universalRuleIds, configuredRules),
    },
    {
      name: 'slop/javascript',
      files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
      plugins: { slop: plugin },
      settings: { slop: settings },
      rules: selectRules(javascriptRuleIds, configuredRules),
    },
  ]
}
