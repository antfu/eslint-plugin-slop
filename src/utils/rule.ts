import type { Rule } from 'eslint'
import { overridePropertiesSchema } from './inspection'

/**
 * Wraps a rule and grants it the global override props (`cwd`, `inspection`)
 * on top of its own options, so every rule can be tuned per entry.
 */
export function defineRule(rule: Rule.RuleModule): Rule.RuleModule {
  const schema = rule.meta?.schema
  const element = Array.isArray(schema) ? schema[0] : schema
  const base = typeof element === 'object' ? element : undefined
  rule.meta = {
    ...rule.meta,
    schema: [{
      type: 'object',
      additionalProperties: false,
      ...base,
      properties: { ...overridePropertiesSchema, ...base?.properties },
    }],
  }
  return rule
}
