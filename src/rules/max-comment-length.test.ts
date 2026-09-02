import { describe, expect, it } from 'vitest'
import { lint } from './test-utils'

describe('max-comment-length', () => {
  it('groups directly adjacent line comments', () => {
    const messages = lint('max-comment-length', [
      'const value = 1',
      '// one two three',
      '// four five six',
    ].join('\n'), [{ maximumWords: 5 }])

    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('6 words')
    expect(messages[0].line).toBe(2)
    expect(messages[0].endLine).toBe(3)
  })

  it('keeps comments separated by a blank line independent', () => {
    const messages = lint('max-comment-length', [
      'const value = 1',
      '// one two three',
      '',
      '// four five six',
    ].join('\n'), [{ maximumWords: 3 }])

    expect(messages).toHaveLength(0)
  })

  it('allows the first pre-code comment block as a file header', () => {
    const messages = lint('max-comment-length', [
      '#!/usr/bin/env node',
      '// one two three four five six seven',
      'const value = 1',
    ].join('\n'), [{ maximumWords: 3 }])

    expect(messages).toHaveLength(0)
  })

  it('ignores JSDoc by default and can inspect it explicitly', () => {
    const code = 'const value = 1\n/** one two three four */\nfunction run() {}'

    expect(lint('max-comment-length', code, [{ maximumWords: 3 }])).toHaveLength(0)
    const messages = lint('max-comment-length', code, [{ ignoreJSDoc: false, maximumWords: 3 }])
    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('4 words')
  })

  it('reports a non-header block over the configured maximum', () => {
    const messages = lint('max-comment-length', 'const value = 1\n/* one two three four */', [{ maximumWords: 3 }])

    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('Keep only context')
  })
})
