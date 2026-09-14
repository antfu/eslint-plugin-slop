import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

const SENTENCE_TERMINATORS = new Set(['.', '!', '?'])

function getPosition(text: string, index: number): { column: number, line: number } {
  const before = text.slice(0, index)
  const lastNewline = before.lastIndexOf('\n')
  return {
    column: index - lastNewline - 1,
    line: before.split('\n').length,
  }
}

function getSentenceRange(text: string, index: number): { end: number, start: number } {
  let start = index
  while (start > 0) {
    const char = text[start - 1]
    if (char === '\n' || SENTENCE_TERMINATORS.has(char))
      break
    start -= 1
  }

  let end = index + 1
  while (end < text.length) {
    const char = text[end]
    if (char === '\n')
      break
    end += 1
    if (SENTENCE_TERMINATORS.has(char))
      break
  }

  while (start < index && /\s/.test(text[start]))
    start += 1
  while (end > index + 1 && /\s/.test(text[end - 1]))
    end -= 1

  return { end, start }
}

export const noEmDash = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/no-em-dash.md',
      description: 'Disallow em dashes in source text.',
    },
    languages: ['*'],
    schema: [],
    messages: {
      avoid: 'Avoid em dashes in prose. Rephrase this sentence with shorter, more natural wording.',
    },
  },
  create(context) {
    let inspected = false

    function inspect(): void {
      if (inspected)
        return
      inspected = true

      const text = context.sourceCode.text
      const reported = new Set<number>()
      for (let index = text.indexOf('\u2014'); index !== -1; index = text.indexOf('\u2014', index + 1)) {
        const sentence = getSentenceRange(text, index)
        if (reported.has(sentence.start))
          continue
        reported.add(sentence.start)

        const start = getPosition(text, sentence.start)
        const end = getPosition(text, sentence.end)
        if (!isReportEligible(context, { startLine: start.line, endLine: end.line }))
          continue

        context.report({
          loc: { start, end },
          messageId: 'avoid',
        })
      }
    }

    return {
      Program: inspect,
      StyleSheet: inspect,
      Document(node: { parent?: { type?: string } }) {
        if (node.parent?.type !== 'Program')
          inspect()
      },
      root: inspect,
    }
  },
})
