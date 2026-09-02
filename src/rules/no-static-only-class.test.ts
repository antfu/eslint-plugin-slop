import type { Linter as LinterTypes } from 'eslint'
import tsParser from '@typescript-eslint/parser'
import { describe, expect, it } from 'vitest'
import { lint } from './test-utils'

describe('no-static-only-class', () => {
  it('reports classes that group only static members', () => {
    const code = [
      'class StringUtils {',
      '  static capitalize(value) { return value }',
      '  static BASE = 10',
      '}',
      'class Empty {}',
    ].join('\n')
    const messages = lint('no-static-only-class', code)

    expect(messages).toHaveLength(1)
    expect(messages[0].message).toContain('namespace')
  })

  it('reports static-only class expressions', () => {
    const code = [
      'const Util = class { static run() {} }',
      'export default class { static run() {} }',
    ].join('\n')

    expect(lint('no-static-only-class', code)).toHaveLength(2)
  })

  it('ignores an empty boilerplate constructor', () => {
    const code = [
      'class Util {',
      '  constructor() {}',
      '  static run() {}',
      '}',
    ].join('\n')

    expect(lint('no-static-only-class', code)).toHaveLength(1)
  })

  it('allows classes with instance state or behavior', () => {
    const code = [
      'class Counter {',
      '  count = 0',
      '  static create() { return new Counter() }',
      '  increment() { this.count++ }',
      '}',
      'class OnlyConstructor { constructor() {} }',
    ].join('\n')

    expect(lint('no-static-only-class', code)).toHaveLength(0)
  })

  it('allows classes with a superclass, interface, abstract, or declare modifier', () => {
    const code = [
      'class Child extends Base { static run() {} }',
      'class Impl implements IFace { static run() {} }',
      'declare class Ambient { static run(): void }',
      'abstract class Abs { static run() {} }',
    ].join('\n')

    expect(lint('no-static-only-class', code, [], tsParser as LinterTypes.Parser)).toHaveLength(0)
  })

  it('allows classes with decorators', () => {
    const code = [
      '@Injectable()',
      'class Service { static run() {} }',
    ].join('\n')

    expect(lint('no-static-only-class', code, [], tsParser as LinterTypes.Parser)).toHaveLength(0)
  })

  it('allows classes with parameter properties or static blocks', () => {
    const withParameterProperty = [
      'class Service {',
      '  constructor(private config) {}',
      '  static create() {}',
      '}',
    ].join('\n')
    expect(lint('no-static-only-class', withParameterProperty, [], tsParser as LinterTypes.Parser)).toHaveLength(0)

    const withStaticBlock = [
      'class Registry {',
      '  static map = new Map()',
      '  static { Registry.map.set(\'a\', 1) }',
      '}',
    ].join('\n')
    expect(lint('no-static-only-class', withStaticBlock)).toHaveLength(0)
  })
})
