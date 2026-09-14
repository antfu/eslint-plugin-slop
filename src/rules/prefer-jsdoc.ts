import type { AST, Rule } from 'eslint'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

interface CommentToken {
  loc: AST.SourceLocation
  range: [number, number]
  type: string
  value: string
}

const directive = /^\/?\s*(?:eslint\b|@?ts-|globals?\b|exported\b|prettier-ignore\b|[cv]8\b|istanbul\b|biome-ignore\b|oxlint\b|noinspection\b)/u
const license = /copyright|license|spdx|©/iu

function lineStart(text: string, index: number): number {
  return text.lastIndexOf('\n', index - 1) + 1
}

function isOwnLine(text: string, comment: CommentToken): boolean {
  return !/\S/u.test(text.slice(lineStart(text, comment.range[0]), comment.range[0]))
}

function trailingLineRun(comments: CommentToken[]): CommentToken[] {
  const run: CommentToken[] = []
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]
    if (comment.type !== 'Line')
      break
    const next = run[0]
    if (next && comment.loc.end.line + 1 !== next.loc.start.line)
      break
    run.unshift(comment)
  }
  return run
}

function toJSDoc(run: CommentToken[], indent: string): string {
  const lines = run.map(comment => comment.value.trim())
  if (lines.length === 1)
    return `/** ${lines[0]} */`
  const body = lines.map(line => (line ? `${indent} * ${line}` : `${indent} *`)).join('\n')
  return `/**\n${body}\n${indent} */`
}

export const preferJsdoc = defineRule({
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/prefer-jsdoc.md',
      description: 'Require /** */ rather than // for the comment documenting an export or member.',
    },
    languages: ['js/js'],
    schema: [],
    messages: {
      preferJsdoc: 'Document this with a /** */ block so editors show it on hover.',
    },
  },
  create(context) {
    // Skip code snippets in markdown and other virtual files
    if (context.filename !== context.physicalFilename)
      return {}

    const source = context.sourceCode
    const text = source.text

    function check(node: Rule.Node): void {
      if (!node.range || !node.loc)
        return

      const before = source.getCommentsBefore(node) as CommentToken[]
      const run = trailingLineRun(before)
      const first = run[0]
      const last = run.at(-1)
      if (!first || !last || !isOwnLine(text, first))
        return

      const runText = run.map(comment => comment.value).join('\n')
      if (directive.test(first.value) || license.test(runText))
        return

      const startsFile = text.slice(0, first.range[0]).trim() === ''
      const gap = node.loc.start.line - last.loc.end.line > 1
      if (startsFile && gap)
        return

      if (!isReportEligible(context, { startLine: first.loc.start.line, endLine: last.loc.end.line }))
        return

      const nodeStart = node.range[0]
      const indent = text.slice(lineStart(text, first.range[0]), first.range[0])
      const nodeIndent = text.slice(lineStart(text, nodeStart), nodeStart)

      context.report({
        loc: { start: first.loc.start, end: last.loc.end },
        messageId: 'preferJsdoc',
        fix: fixer => fixer.replaceTextRange(
          [first.range[0], nodeStart],
          `${toJSDoc(run, indent)}\n${nodeIndent}`,
        ),
      })
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration)
          check(node)
      },
      ExportDefaultDeclaration: check,
      PropertyDefinition: check,
      MethodDefinition: check,
      TSPropertySignature: check,
      TSMethodSignature: check,
      TSIndexSignature: check,
      TSAbstractPropertyDefinition: check,
      TSAbstractMethodDefinition: check,
      TSEnumMember: check,
    }
  },
})
