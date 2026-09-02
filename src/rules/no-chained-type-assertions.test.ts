import type { Linter as LinterTypes } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import { lint } from './test-utils'

describe('no-chained-type-assertions', () => {
  const parser = tsParser as LinterTypes.Parser

  it('reports the outer assertion once for each chain', () => {
    const code = [
      'const first = value as unknown as string',
      'const second = <unknown><string>value',
    ].join('\n')
    const messages = lint('no-chained-type-assertions', code, [], parser)

    expect(messages).toHaveLength(2)
    expect(messages.map(message => message.line)).toEqual([1, 2])
    expect(messages.every(message => message.message.includes('parse untrusted input'))).toBe(true)
  })

  it('allows a single assertion and all-const chains', () => {
    const code = [
      'const first = value as string',
      'const second = value as const as const',
    ].join('\n')

    expect(lint('no-chained-type-assertions', code, [], parser)).toHaveLength(0)
  })
})
