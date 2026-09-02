import type { Linter as LinterTypes } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import { lint, lintFix } from './test-utils'

describe('prefer-jsdoc', () => {
  const parser = tsParser as LinterTypes.Parser

  it('converts a single line comment above an export to a one-liner', () => {
    const code = '// Parses the config file\nexport function parseConfig(path) {}'
    const [message] = lint('prefer-jsdoc', code)

    expect(message.line).toBe(1)
    expect(lintFix('prefer-jsdoc', code)).toBe('/** Parses the config file */\nexport function parseConfig(path) {}')
  })

  it('converts a multi-line run to a block and closes the blank-line gap', () => {
    const code = 'const x = 1\n// first\n// second\n\nexport const value = 1'

    expect(lintFix('prefer-jsdoc', code)).toBe('const x = 1\n/**\n * first\n * second\n */\nexport const value = 1')
  })

  it('documents interface, class, and enum members', () => {
    const code = [
      'interface RecordOptions {',
      '  // run without a window',
      '  headless: boolean',
      '}',
      'class C {',
      '  // the id',
      '  id = 1',
      '}',
      'enum E {',
      '  // the first',
      '  A,',
      '}',
    ].join('\n')
    const messages = lint('prefer-jsdoc', code, [], parser)

    expect(messages.map(message => message.line)).toEqual([2, 6, 10])
    expect(lintFix('prefer-jsdoc', code, [], parser)).toContain('  /** run without a window */')
  })

  it('leaves block comments, trailing comments, license headers, and directives alone', () => {
    expect(lint('prefer-jsdoc', '/** already */\nexport const a = 1')).toHaveLength(0)
    expect(lint('prefer-jsdoc', 'export const a = 1 // trailing\nexport const b = 2')).toHaveLength(0)
    expect(lint('prefer-jsdoc', '// Copyright 2026 Someone\nexport const a = 1')).toHaveLength(0)
    expect(lint('prefer-jsdoc', '// @ts-expect-error legacy api\nexport const a = 1')).toHaveLength(0)
  })

  it('skips a file header separated from the export by a blank line', () => {
    expect(lint('prefer-jsdoc', '// module overview\n\nexport const a = 1')).toHaveLength(0)
  })

  it('ignores destructuring properties and non-exported declarations', () => {
    expect(lint('prefer-jsdoc', '// note\nconst { a } = obj')).toHaveLength(0)
    expect(lint('prefer-jsdoc', '// note\nconst a = 1')).toHaveLength(0)
  })
})
