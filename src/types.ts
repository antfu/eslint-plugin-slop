import type { Linter } from 'eslint'

export type SlopInspection
  = | { mode: 'full' }
    | { mode: 'uncommitted' }
    | { mode: 'recent-changes', tracebackCommits?: number }

export type SlopRuleName
  = | 'max-comment-length'
    | 'no-chained-type-assertions'
    | 'no-em-dash'
    | 'no-trivial-functions'
    | 'no-trivial-type-aliases'

export type SlopRuleId = `slop/${SlopRuleName}`

export interface SlopConfigOptions {
  cwd?: string
  inspection?: SlopInspection
  rules?: Partial<Record<SlopRuleId, Linter.RuleEntry>>
}

export interface SlopSettings {
  cwd: string
  inspection: SlopInspection
}
