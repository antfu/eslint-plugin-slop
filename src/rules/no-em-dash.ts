import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

function getPosition(text: string, index: number): { column: number, line: number } {
  const before = text.slice(0, index)
  const lastNewline = before.lastIndexOf('\n')
  return {
    column: index - lastNewline - 1,
    line: before.split('\n').length,
  }
}

export const noEmDash = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
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
      for (let index = text.indexOf('\u2014'); index !== -1; index = text.indexOf('\u2014', index + 1)) {
        const start = getPosition(text, index)
        const end = { column: start.column + 1, line: start.line }
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
