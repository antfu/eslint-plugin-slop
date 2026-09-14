import type { Rule } from 'eslint'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

interface Options {
  ignoreJSDoc?: boolean
  maximumWords?: number
}

type SourceComment = ReturnType<Rule.RuleContext['sourceCode']['getAllComments']>[number]
type Comment = SourceComment & {
  loc: NonNullable<SourceComment['loc']>
  range: [number, number]
}

interface CommentGroup {
  comments: Comment[]
  end: number
  loc: NonNullable<Comment['loc']>
  start: number
}

function groupComments(sourceText: string, comments: Comment[]): CommentGroup[] {
  const groups: CommentGroup[] = []

  for (const comment of comments) {
    if (sourceText.startsWith('#!', comment.range[0]))
      continue

    const previous = groups.at(-1)
    const canJoin = comment.type === 'Line'
      && previous?.comments.at(-1)?.type === 'Line'
      && previous.loc.end.line + 1 === comment.loc.end.line
      && /^\s*$/u.test(sourceText.slice(previous.end, comment.range[0]))

    if (canJoin && previous) {
      previous.comments.push(comment)
      previous.end = comment.range[1]
      previous.loc.end = comment.loc.end
      continue
    }

    groups.push({
      comments: [comment],
      start: comment.range[0],
      end: comment.range[1],
      loc: {
        start: { ...comment.loc.start },
        end: { ...comment.loc.end },
      },
    })
  }

  return groups
}

function getCommentText(comment: Comment): string {
  if (comment.type !== 'Block')
    return comment.value
  return comment.value.replace(/^\s*\* ?/gmu, '')
}

function countWords(group: CommentGroup): number {
  const text = group.comments.map(getCommentText).join(' ').trim()
  return text ? text.split(/\s+/u).length : 0
}

export const maxCommentLength = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/max-comment-length.md',
      description: 'Limit comments by word count.',
    },
    languages: ['js/js'],
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        ignoreJSDoc: { type: 'boolean' },
        maximumWords: { type: 'integer', minimum: 1 },
      },
    }],
    defaultOptions: [{ ignoreJSDoc: true, maximumWords: 50 }],
    messages: {
      tooLong: 'This comment has {{count}} words; the configured maximum is {{maximum}}. Keep only context the code cannot express.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const ignoreJSDoc = options.ignoreJSDoc ?? true
    const maximumWords = options.maximumWords ?? 50

    return {
      Program(program) {
        const comments = context.sourceCode.getAllComments() as Comment[]
        const groups = groupComments(context.sourceCode.text, comments)
        const firstToken = context.sourceCode.getFirstToken(program)
        const header = groups.find(group => !firstToken || group.end <= firstToken.range[0])

        for (const group of groups) {
          if (group === header)
            continue
          if (ignoreJSDoc && group.comments.length === 1 && group.comments[0].type === 'Block' && context.sourceCode.text.startsWith('/**', group.start))
            continue

          const count = countWords(group)
          if (count <= maximumWords || !isReportEligible(context, group))
            continue

          context.report({
            loc: group.loc,
            messageId: 'tooLong',
            data: { count, maximum: maximumWords },
          })
        }
      },
    }
  },
})
