import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

interface Options {
  allow?: string[]
  extraWords?: string[]
  ignoreJSDoc?: boolean
  words?: string[]
}

export const defaultJargonWords = [
  'utilize',
  'utilise',
  'leverage',
  'delve',
  'facilitate',
  'streamline',
  'seamless',
  'seamlessly',
  'robust',
  'comprehensive',
  'meticulous',
  'meticulously',
  'crucial',
  'pivotal',
  'myriad',
  'plethora',
  'paramount',
  'holistic',
  'multifaceted',
  'nuanced',
  'synergy',
  'bolster',
  'encompass',
  'endeavor',
  'endeavour',
  'aforementioned',
  'commence',
] as const

const swaps: Record<string, string> = {
  utilize: 'use',
  utilise: 'use',
  leverage: 'use',
  facilitate: 'help',
  streamline: 'simplify',
  comprehensive: 'complete',
  crucial: 'important',
  paramount: 'important',
  encompass: 'include',
  commence: 'start',
}

function getPosition(text: string, index: number): { column: number, line: number } {
  const before = text.slice(0, index)
  const lastNewline = before.lastIndexOf('\n')
  return { column: index - lastNewline - 1, line: before.split('\n').length }
}

function escape(word: string): string {
  return word.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function toPattern(word: string): string {
  const base = escape(word)
  const parts = [`${base}(?:s|es|d|ed|ing|ly|ally)?`]
  if (word.endsWith('e'))
    parts.push(`${escape(word.slice(0, -1))}(?:ing|ed|es)`)
  if (word.endsWith('y'))
    parts.push(`${escape(word.slice(0, -1))}ies`)
  return parts.join('|')
}

function buildMatcher(words: string[]): RegExp | null {
  if (words.length === 0)
    return null
  return new RegExp(`\\b(?:${words.map(toPattern).join('|')})\\b`, 'giu')
}

function isQuoted(text: string, index: number): boolean {
  let backticks = 0
  let doubleQuotes = 0
  for (let i = 0; i < index; i++) {
    if (text[i] === '`')
      backticks++
    else if (text[i] === '"')
      doubleQuotes++
  }
  return backticks % 2 === 1 || doubleQuotes % 2 === 1
}

export const noJargon = defineRule({
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/no-jargon.md',
      description: 'Disallow inflated vocabulary in comments.',
    },
    languages: ['js/js'],
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        allow: { type: 'array', items: { type: 'string' } },
        extraWords: { type: 'array', items: { type: 'string' } },
        ignoreJSDoc: { type: 'boolean' },
        words: { type: 'array', items: { type: 'string' } },
      },
    }],
    defaultOptions: [{ ignoreJSDoc: false }],
    messages: {
      jargon: 'Avoid "{{word}}" in comments. Prefer plainer wording a person would type.',
      replace: 'Replace "{{word}}" with "{{replacement}}".',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const allow = new Set((options.allow ?? []).map(word => word.toLowerCase()))
    const words = (options.words ?? [...defaultJargonWords])
      .concat(options.extraWords ?? [])
      .filter(word => !allow.has(word.toLowerCase()))
    const matcher = buildMatcher(words)
    const ignoreJSDoc = options.ignoreJSDoc ?? false

    function inspect(): void {
      if (!matcher)
        return

      const source = context.sourceCode
      const text = source.text
      for (const comment of source.getAllComments()) {
        const range = comment.range as [number, number]
        if (ignoreJSDoc && comment.type === 'Block' && text.startsWith('/**', range[0]))
          continue

        const raw = text.slice(range[0], range[1])
        matcher.lastIndex = 0
        for (let match = matcher.exec(raw); match; match = matcher.exec(raw)) {
          if (isQuoted(raw, match.index))
            continue

          const matchStart = range[0] + match.index
          const start = getPosition(text, matchStart)
          const end = { column: start.column + match[0].length, line: start.line }
          if (!isReportEligible(context, { startLine: start.line, endLine: end.line }))
            continue

          const replacement = swaps[match[0].toLowerCase()]
          context.report({
            loc: { start, end },
            messageId: 'jargon',
            data: { word: match[0] },
            suggest: replacement
              ? [{
                  messageId: 'replace',
                  data: { word: match[0], replacement },
                  fix: fixer => fixer.replaceTextRange([matchStart, matchStart + match[0].length], replacement),
                }]
              : undefined,
          })
        }
      }
    }

    return { Program: inspect }
  },
})
