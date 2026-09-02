import type { Linter as LinterTypes } from 'eslint'
import type { SlopInspectionOption } from '../src'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Linter } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'
import plugin, { createSlopConfig } from '../src'

const temporaryDirectories: string[] = []

function createDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'eslint-plugin-slop-'))
  temporaryDirectories.push(directory)
  return directory
}

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', ['-C', cwd, ...args], { stdio: 'ignore' })
}

function createRepository(content: string): { directory: string, file: string } {
  const directory = createDirectory()
  const file = join(directory, 'fixture.js')
  mkdirSync(directory, { recursive: true })
  git(directory, 'init', '--quiet')
  git(directory, 'config', 'user.email', 'slop@example.test')
  git(directory, 'config', 'user.name', 'Slop Tests')
  git(directory, 'config', 'commit.gpgSign', 'false')
  writeFileSync(file, content)
  git(directory, 'add', 'fixture.js')
  git(directory, 'commit', '--quiet', '-m', 'initial')
  return { directory, file }
}

function lintWithConfig(
  content: string,
  file: string,
  cwd: string,
  inspection?: SlopInspectionOption,
): LinterTypes.LintMessage[] {
  const linter = new Linter({ configType: 'flat', cwd })
  return linter.verify(content, createSlopConfig({ cwd, inspection }), file)
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { force: true, recursive: true })
})

describe('createSlopConfig', () => {
  it('returns universal and JavaScript entries with every rule at error', () => {
    const [universal, javascript] = createSlopConfig({ cwd: '/workspace' })

    expect(universal.name).toBe('slop/universal')
    expect(universal.rules).toEqual({ 'slop/no-em-dash': 'error' })
    expect(javascript.name).toBe('slop/javascript')
    expect(javascript.files).toEqual(['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'])
    expect(javascript.rules).toEqual({
      'slop/max-comment-length': 'error',
      'slop/no-chained-type-assertions': 'error',
      'slop/no-jargon': 'error',
      'slop/no-static-only-class': 'error',
      'slop/no-trivial-functions': 'error',
      'slop/no-trivial-type-aliases': 'error',
      'slop/prefer-jsdoc': 'error',
    })
    expect(universal.settings).toEqual({
      slop: {
        cwd: resolve('/workspace'),
        inspection: { mode: 'recent-changes', tracebackCommits: 5 },
      },
    })
  })

  it('merges rule overrides and validates tracebackCommits', () => {
    const config = createSlopConfig({
      inspection: { mode: 'full' },
      rules: { 'slop/no-em-dash': 'off' },
    })

    expect(config[0].rules).toEqual({ 'slop/no-em-dash': 'off' })
    expect(() => createSlopConfig({
      inspection: { mode: 'recent-changes', tracebackCommits: 0 },
    })).toThrow('positive integer')
  })

  it('accepts a bare mode string as inspection shorthand', () => {
    const [universal] = createSlopConfig({ cwd: '/workspace', inspection: 'full' })

    expect(universal.settings).toEqual({
      slop: { cwd: '/workspace', inspection: { mode: 'full' } },
    })
  })

  it('exposes rules without bundled configs on the raw plugin', () => {
    expect(plugin.rules).toBeDefined()
    expect('configs' in plugin).toBe(false)
  })
})

describe('git-aware inspection', () => {
  it('uses full inspection when raw rules have no slop settings', () => {
    const linter = new Linter({ configType: 'flat' })
    const messages = linter.verify('const text = "old \u2014 prose"', {
      plugins: { slop: plugin },
      rules: { 'slop/no-em-dash': 'error' },
    })

    expect(messages).toHaveLength(1)
  })

  it('limits uncommitted inspection to lines changed from HEAD', () => {
    const baseline = 'const oldText = "old \u2014 prose"\nconst clean = true\n'
    const { directory, file } = createRepository(baseline)
    const current = 'const oldText = "old \u2014 prose"\nconst clean = "new \u2014 prose"\n'

    expect(lintWithConfig(baseline, file, directory, { mode: 'uncommitted' })).toHaveLength(0)
    expect(lintWithConfig(current, file, directory, { mode: 'uncommitted' })).toHaveLength(1)
  })

  it('compares the exact linted buffer, including unsaved changes', () => {
    const baseline = 'const clean = true\n'
    const { directory, file } = createRepository(baseline)
    const unsaved = 'const clean = "unsaved \u2014 prose"\n'

    expect(readFileSync(file, 'utf8')).toBe(baseline)
    expect(lintWithConfig(unsaved, file, directory, { mode: 'uncommitted' })).toHaveLength(1)
  })

  it('treats every line of an untracked file as eligible', () => {
    const { directory } = createRepository('const clean = true\n')
    const file = join(directory, 'new.js')
    const content = 'const first = "one \u2014 two"\nconst second = "three \u2014 four"\n'
    writeFileSync(file, content)

    expect(lintWithConfig(content, file, directory, { mode: 'uncommitted' })).toHaveLength(2)
  })

  it('uses the net diff from the configured recent commit baseline', () => {
    const baseline = 'const oldText = "old \u2014 prose"\nconst clean = true\n'
    const { directory, file } = createRepository(baseline)
    const current = 'const oldText = "old \u2014 prose"\nconst clean = "new \u2014 prose"\n'
    writeFileSync(file, current)
    git(directory, 'add', 'fixture.js')
    git(directory, 'commit', '--quiet', '-m', 'change second line')

    const messages = lintWithConfig(current, file, directory, {
      mode: 'recent-changes',
      tracebackCommits: 1,
    })

    expect(messages).toHaveLength(1)
    expect(messages[0].line).toBe(2)
  })

  it('inspects the full file when the requested history is unavailable', () => {
    const content = 'const oldText = "old \u2014 prose"\n'
    const { directory, file } = createRepository(content)

    expect(lintWithConfig(content, file, directory, {
      mode: 'recent-changes',
      tracebackCommits: 5,
    })).toHaveLength(1)
  })

  it('lets a rule override the global inspection with its own options', () => {
    const baseline = 'const oldText = "old \u2014 prose"\nconst clean = true\n'
    const { directory, file } = createRepository(baseline)
    const current = 'const oldText = "old \u2014 prose"\nconst clean = "new \u2014 prose"\n'
    const linter = new Linter({ configType: 'flat', cwd: directory })

    const messages = linter.verify(current, createSlopConfig({
      cwd: directory,
      inspection: 'uncommitted',
      rules: { 'slop/no-em-dash': ['error', { inspection: 'full' }] },
    }), file)

    expect(messages.map(message => message.line)).toEqual([1, 2])
  })

  it('falls back to full inspection outside a Git repository', () => {
    const directory = createDirectory()
    const file = join(directory, 'fixture.js')
    const content = 'const text = "one \u2014 two"\n'
    writeFileSync(file, content)

    expect(lintWithConfig(content, file, directory, { mode: 'uncommitted' })).toHaveLength(1)
  })
})
