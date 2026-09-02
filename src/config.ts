import type { Linter } from 'eslint'
import type { SlopConfigOptions, SlopInspection, SlopRuleId, SlopSettings } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import plugin from './plugin'

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

function normalizeInspection(inspection: SlopInspection | undefined): SlopInspection {
  if (!inspection)
    return { mode: 'recent-changes', tracebackCommits: 5 }
  if (inspection.mode !== 'recent-changes')
    return inspection

  const tracebackCommits = inspection.tracebackCommits ?? 5
  if (!Number.isInteger(tracebackCommits) || tracebackCommits < 1)
    throw new TypeError('inspection.tracebackCommits must be a positive integer.')

  return { mode: 'recent-changes', tracebackCommits }
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
