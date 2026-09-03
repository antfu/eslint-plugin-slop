import type { Linter } from 'eslint'

export type SlopInspectionMode = 'full' | 'uncommitted' | 'recent-changes'

export type SlopInspection
  = | { mode: 'full' }
    | { mode: 'uncommitted' }
    | { mode: 'recent-changes', tracebackCommits?: number }

/** Inspection config accepting a bare mode string as shorthand for `{ mode }`. */
export type SlopInspectionOption = SlopInspectionMode | SlopInspection

/** Global props each rule may override through its own options entry. */
export interface SlopOverrides {
  cwd?: string
  inspection?: SlopInspectionOption
}

export type SlopRuleName
  = | 'max-comment-length'
    | 'no-chained-type-assertions'
    | 'no-em-dash'
    | 'no-jargon'
    | 'no-static-only-class'
    | 'no-trivial-functions'
    | 'no-trivial-type-aliases'
    | 'prefer-jsdoc'

export type SlopRuleId = `slop/${SlopRuleName}`

export interface SlopConfigOptions {
  cwd?: string
  inspection?: SlopInspectionOption
  rules?: Partial<Record<SlopRuleId, Linter.RuleEntry>>
}

export interface SlopSettings {
  cwd: string
  inspection: SlopInspection
}
