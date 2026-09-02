import type { Rule } from 'eslint'
import type { SlopInspection, SlopSettings } from '../types'
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { diffArrays } from 'diff'

interface SourceCodeLike {
  text: string
}

interface ContextLike {
  cwd: string
  filename: string
  physicalFilename: string
  settings: Record<string, unknown>
  sourceCode: SourceCodeLike
}

interface LocationLike {
  loc?: {
    end: { line: number }
    start: { line: number }
  } | null
}

const changedLinesCache = new WeakMap<object, Set<number> | null>()
const gitRootCache = new Map<string, string | null>()
const baselineCache = new Map<string, string>()

function runGit(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  }
  catch {
    return null
  }
}

function getGitRoot(cwd: string): string | null {
  const normalizedCwd = resolve(cwd)
  if (!gitRootCache.has(normalizedCwd))
    gitRootCache.set(normalizedCwd, runGit(normalizedCwd, ['rev-parse', '--show-toplevel'])?.trim() ?? null)
  return gitRootCache.get(normalizedCwd) ?? null
}

function getSettings(context: ContextLike): SlopSettings | null {
  const settings = context.settings.slop
  if (!settings || typeof settings !== 'object')
    return null

  const candidate = settings as Partial<SlopSettings>
  if (typeof candidate.cwd !== 'string' || !candidate.inspection)
    return null

  return candidate as SlopSettings
}

function getBaselineRevision(root: string, inspection: SlopInspection): string | null {
  if (inspection.mode === 'full')
    return null

  const requestedRevision = inspection.mode === 'uncommitted'
    ? 'HEAD'
    : `HEAD~${inspection.tracebackCommits ?? 5}`

  return runGit(root, ['rev-parse', '--verify', requestedRevision])?.trim() ?? null
}

function getBaselineText(root: string, revision: string | null, filePath: string): string {
  if (!revision)
    return ''

  const key = `${root}\0${revision}\0${filePath}`
  if (!baselineCache.has(key))
    baselineCache.set(key, runGit(root, ['show', `${revision}:${filePath}`]) ?? '')
  return baselineCache.get(key) ?? ''
}

function splitLines(text: string): string[] {
  return text.split(/\r\n|[\n\r]/u)
}

function findChangedLines(baseline: string, current: string): Set<number> {
  const lines = new Set<number>()
  let currentLine = 1

  for (const change of diffArrays(splitLines(baseline), splitLines(current))) {
    if (change.removed)
      continue

    if (change.added) {
      for (let index = 0; index < change.value.length; index++)
        lines.add(currentLine + index)
    }

    currentLine += change.value.length
  }

  return lines
}

function resolveLintedFile(context: ContextLike, root: string): string | null {
  const filename = context.physicalFilename || context.filename
  if (!filename || filename === '<input>' || filename === '<text>')
    return null

  let absoluteFilename = isAbsolute(filename)
    ? filename
    : resolve(context.cwd, filename)
  try {
    absoluteFilename = realpathSync.native(absoluteFilename)
  }
  catch {
    try {
      absoluteFilename = resolve(realpathSync.native(dirname(absoluteFilename)), basename(absoluteFilename))
    }
    catch {}
  }
  const repoRelative = relative(root, absoluteFilename)

  if (repoRelative === '..' || repoRelative.startsWith(`..${sep}`) || isAbsolute(repoRelative))
    return null

  return repoRelative.split(sep).join('/')
}

function getChangedLines(context: ContextLike): Set<number> | null {
  const cached = changedLinesCache.get(context.sourceCode)
  if (cached !== undefined)
    return cached

  const settings = getSettings(context)
  if (!settings || settings.inspection.mode === 'full') {
    changedLinesCache.set(context.sourceCode, null)
    return null
  }

  const root = getGitRoot(settings.cwd)
  const relativeFilename = root && resolveLintedFile(context, root)
  if (!root || !relativeFilename) {
    changedLinesCache.set(context.sourceCode, null)
    return null
  }

  const baselineRevision = getBaselineRevision(root, settings.inspection)
  const baseline = getBaselineText(root, baselineRevision, relativeFilename)
  const lines = findChangedLines(baseline, context.sourceCode.text)
  changedLinesCache.set(context.sourceCode, lines)
  return lines
}

export function isReportEligible(
  context: Rule.RuleContext,
  location: LocationLike | { endLine: number, startLine: number },
): boolean {
  const lines = getChangedLines(context as ContextLike)
  if (!lines)
    return true

  const startLine = 'startLine' in location
    ? location.startLine
    : location.loc?.start.line
  const endLine = 'endLine' in location
    ? location.endLine
    : location.loc?.end.line

  if (startLine === undefined || endLine === undefined)
    return true

  for (let line = startLine; line <= endLine; line++) {
    if (lines.has(line))
      return true
  }

  return false
}
