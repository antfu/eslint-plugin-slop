import type { Linter as LinterTypes } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import { lint } from './test-utils'

describe('no-trivial-type-aliases', () => {
  const parser = tsParser as LinterTypes.Parser

  it('reports primitive and unknown aliases through same-file chains', () => {
    const code = [
      'type UserId = string',
      'type AccountId = UserId',
      'type Unchecked = unknown',
      'export type Input = Unchecked',
    ].join('\n')
    const messages = lint('no-trivial-type-aliases', code, [], parser)

    expect(messages).toHaveLength(4)
    expect(messages.map(message => message.messageId)).toEqual([
      'primitive',
      'primitive',
      'unknown',
      'unknown',
    ])
  })

  it('allows aliases that add structure or cannot be resolved locally', () => {
    const code = [
      'type Identifier = string & { readonly __brand: unique symbol }',
      'type State = "open" | "closed"',
      'type Items = string[]',
      'type Pair = [string, number]',
      'type ImportedAlias = ExternalType',
      'type Box<T> = T',
    ].join('\n')

    expect(lint('no-trivial-type-aliases', code, [], parser)).toHaveLength(0)
  })
})
