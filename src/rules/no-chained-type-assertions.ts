import type { TSESTree } from '@typescript-eslint/utils'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

type AssertionNode = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion

function isAssertion(node: TSESTree.Node | undefined): node is AssertionNode {
  return node?.type === 'TSAsExpression' || node?.type === 'TSTypeAssertion'
}

function isConstAssertion(node: AssertionNode): boolean {
  const annotation = node.typeAnnotation
  return annotation.type === 'TSTypeReference'
    && annotation.typeName.type === 'Identifier'
    && annotation.typeName.name === 'const'
    && !annotation.typeArguments
}

function inspectAssertion(context: Parameters<typeof isReportEligible>[0], node: AssertionNode): void {
  if (isAssertion(node.parent) && node.parent.expression === node)
    return

  let count = 0
  let everyAssertionIsConst = true
  let current: TSESTree.Node = node

  while (isAssertion(current)) {
    count++
    everyAssertionIsConst &&= isConstAssertion(current)
    current = current.expression
  }

  if (count < 2 || everyAssertionIsConst || !isReportEligible(context, node))
    return

  context.report({
    node: node as never,
    messageId: 'chained',
  })
}

export const noChainedTypeAssertions = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/no-chained-type-assertions.md',
      description: 'Disallow chains of TypeScript type assertions.',
    },
    languages: ['js/js'],
    schema: [],
    messages: {
      chained: 'This assertion chain discards type evidence. Keep the original precise type, or parse untrusted input at its boundary before narrowing it.',
    },
  },
  create(context) {
    return {
      TSAsExpression(node: unknown) {
        inspectAssertion(context, node as TSESTree.TSAsExpression)
      },
      TSTypeAssertion(node: unknown) {
        inspectAssertion(context, node as TSESTree.TSTypeAssertion)
      },
    }
  },
})
