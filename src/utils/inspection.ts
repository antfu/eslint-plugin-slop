import type { Rule } from 'eslint'
import type { SlopInspection, SlopInspectionOption } from '../types'

type JsonSchema = Exclude<NonNullable<Rule.RuleMetaData['schema']>, readonly unknown[]>

const inspectionModes = ['full', 'uncommitted', 'recent-changes']

export function normalizeInspection(input: SlopInspectionOption | undefined): SlopInspection {
  const mode = typeof input === 'string' ? input : input?.mode
  switch (mode) {
    case 'full':
      return { mode: 'full' }
    case 'uncommitted':
      return { mode: 'uncommitted' }
    default: {
      const tracebackCommits = (typeof input === 'object' && input.mode === 'recent-changes' ? input.tracebackCommits : undefined) ?? 5
      if (!Number.isInteger(tracebackCommits) || tracebackCommits < 1)
        throw new TypeError('inspection.tracebackCommits must be a positive integer.')
      return { mode: 'recent-changes', tracebackCommits }
    }
  }
}

/** JSON schema for the global props any rule may override in its options object. */
export const overridePropertiesSchema: Record<string, JsonSchema> = {
  cwd: { type: 'string' },
  inspection: {
    oneOf: [
      { type: 'string', enum: inspectionModes },
      {
        type: 'object',
        additionalProperties: false,
        required: ['mode'],
        properties: {
          mode: { type: 'string', enum: inspectionModes },
          tracebackCommits: { type: 'integer', minimum: 1 },
        },
      },
    ],
  },
}
