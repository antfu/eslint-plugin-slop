import type { Linter as LinterTypes } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import { lint } from './test-utils'

describe('no-trivial-functions', () => {
  it('reports low-use property access and transparent forwarding', () => {
    const code = [
      'function getName(user) { return user.profile.name }',
      'const parse = value => parseValue(value)',
      'getName(user)',
      'parse(input)',
    ].join('\n')
    const messages = lint('no-trivial-functions', code)

    expect(messages).toHaveLength(2)
    expect(messages.every(message => message.message.includes('1 external references'))).toBe(true)
  })

  it('exempts direct and later ESM exports', () => {
    const code = [
      'export function getName(user) { return user.name }',
      'const parse = value => parseValue(value)',
      'const format = value => formatValue(value)',
      'export { parse }',
      'export default format',
    ].join('\n')

    expect(lint('no-trivial-functions', code)).toHaveLength(0)
  })

  it('does not treat type exports or re-exports as public value interfaces', () => {
    const code = [
      'const parse = value => parseValue(value)',
      'const remote = value => remoteValue(value)',
      'export type { parse }',
      'export { remote } from "./remote"',
    ].join('\n')

    expect(lint('no-trivial-functions', code, [], tsParser as LinterTypes.Parser)).toHaveLength(2)
  })

  it('uses a configurable external reference threshold', () => {
    const code = [
      'const getName = user => user.name',
      'getName(first)',
      'getName(second)',
    ].join('\n')

    expect(lint('no-trivial-functions', code, [{ minimumReferences: 2 }])).toHaveLength(0)
    expect(lint('no-trivial-functions', code, [{ minimumReferences: 3 }])).toHaveLength(1)
  })

  it('does not count recursive or type-only references', () => {
    const code = [
      'const forward = value => forward(value)',
      'type Forward = typeof forward',
    ].join('\n')
    const messages = lint('no-trivial-functions', code, [], tsParser as LinterTypes.Parser)

    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('0 external references')
  })

  it('allows functions with transformations or added behavior', () => {
    const code = [
      'const create = user => ({ name: user.name })',
      'const increment = value => value + 1',
      'const normalize = value => parseValue(value.trim())',
      'const choose = value => value ? first : second',
      'function validate(value) { if (!value) throw new Error(); return value }',
      'function outer() { const nested = value => parseValue(value); return nested }',
    ].join('\n')

    expect(lint('no-trivial-functions', code)).toHaveLength(0)
  })
})
