import markdown from '@eslint/markdown'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import plugin from '../plugin'
import { lint } from './test-utils'

describe('no-em-dash', () => {
  it('reports every literal em dash with its exact location', () => {
    const messages = lint('no-em-dash', 'const note = "one \u2014 two"\n// three \u2014 four')

    expect(messages).toHaveLength(2)
    expect(messages.map(message => ({
      column: message.column,
      endColumn: message.endColumn,
      line: message.line,
    }))).toEqual([
      { column: 19, endColumn: 20, line: 1 },
      { column: 10, endColumn: 11, line: 2 },
    ])
    expect(messages[0].message).toContain('Rephrase this sentence')
    expect(messages[0].fix).toBeUndefined()
  })

  it('allows adjacent dashes, en dashes, and escaped characters', () => {
    expect(lint('no-em-dash', String.raw`const note = "one -- two – three \u2014 four"`)).toHaveLength(0)
  })

  it('runs with parser-provided Markdown languages', () => {
    const linter = new Linter({ configType: 'flat' })
    const messages = linter.verify('# Heading\n\nShort \u2014 direct.', {
      files: ['**/*.md'],
      language: 'markdown/gfm',
      plugins: { markdown, slop: plugin },
      rules: { 'slop/no-em-dash': 'error' },
    }, 'README.md')

    expect(messages).toHaveLength(1)
    expect(messages[0].line).toBe(3)
  })
})
