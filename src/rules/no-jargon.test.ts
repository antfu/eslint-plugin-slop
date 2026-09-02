import { describe, expect, it } from 'vitest'
import { applyFix, lint } from './test-utils'

describe('no-jargon', () => {
  it('reports each jargon word with its location and inflections', () => {
    const messages = lint('no-jargon', '// utilize the robust cache to streamline lookups\n// delving deeper')

    expect(messages.map(message => ({ word: message.message.match(/"([^"]+)"/u)?.[1], line: message.line, column: message.column })))
      .toEqual([
        { word: 'utilize', line: 1, column: 4 },
        { word: 'robust', line: 1, column: 16 },
        { word: 'streamline', line: 1, column: 32 },
        { word: 'delving', line: 2, column: 4 },
      ])
  })

  it('matches ies and ally inflections', () => {
    expect(lint('no-jargon', '// synergies handled holistically')).toHaveLength(2)
  })

  it('offers a replacement suggestion only where a clean swap exists', () => {
    const code = '// utilize the robust value'
    const [utilize, robust] = lint('no-jargon', code)

    expect(applyFix(code, utilize.suggestions?.[0].fix)).toBe('// use the robust value')
    expect(robust.suggestions ?? []).toHaveLength(0)
  })

  it('ignores words inside backticks or double quotes', () => {
    expect(lint('no-jargon', '// the word `utilize` and "robust" are fine')).toHaveLength(0)
  })

  it('respects allow, extraWords, and ignoreJSDoc', () => {
    expect(lint('no-jargon', '// utilize this', [{ allow: ['utilize'] }])).toHaveLength(0)
    expect(lint('no-jargon', '// blazingly fast', [{ extraWords: ['blazingly'] }])).toHaveLength(1)
    expect(lint('no-jargon', '/** utilize this */', [{ ignoreJSDoc: true }])).toHaveLength(0)
    expect(lint('no-jargon', '/** utilize this */')).toHaveLength(1)
  })
})
