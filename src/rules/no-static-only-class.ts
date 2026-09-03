import type { TSESTree } from '@typescript-eslint/utils'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression
type ClassMember = ClassNode['body']['body'][number]

/**
 * An empty parameterless constructor only reinforces the namespace shell;
 * it carries no instance state and is ignored. A constructor with parameters
 * (including TS parameter properties) creates instance state and disqualifies.
 */
function isBoilerplateConstructor(member: ClassMember): boolean {
  if (member.type !== 'MethodDefinition' || member.kind !== 'constructor' || member.static)
    return false
  const { params, body } = member.value
  return params.length === 0 && body !== null && body.body.length === 0
}

function isDecorated(member: ClassMember): boolean {
  return 'decorators' in member && Array.isArray(member.decorators) && member.decorators.length > 0
}

/**
 * Returns the behavior-carrying members when every one of them is static,
 * otherwise null. Static blocks are excluded upfront: they run at class
 * definition time, so converting them to module scope changes semantics.
 */
function getStaticOnlyMembers(node: ClassNode): ClassMember[] | null {
  const members = node.body.body.filter(member => !isBoilerplateConstructor(member))
  if (members.length === 0)
    return null
  if (members.some(member => member.type === 'StaticBlock' || isDecorated(member)))
    return null
  if (!members.every(member => 'static' in member && member.static === true))
    return null
  return members
}

/**
 * A superclass, interface implementation, decorators, or an `abstract` /
 * ambient `declare` modifier signal that the class plays a real type or
 * framework role.
 */
function hasClassShellSignals(node: ClassNode): boolean {
  if (node.superClass)
    return true
  if (node.decorators && node.decorators.length > 0)
    return true
  if (node.implements && node.implements.length > 0)
    return true
  if (node.abstract || node.declare)
    return true
  return false
}

function check(context: Parameters<typeof isReportEligible>[0], node: ClassNode): void {
  if (hasClassShellSignals(node))
    return
  if (!getStaticOnlyMembers(node))
    return
  if (!isReportEligible(context, node))
    return

  context.report({
    node: (node.id ?? node) as never,
    messageId: 'staticOnly',
  })
}

export const noStaticOnlyClass = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow classes that group only static members.',
    },
    languages: ['js/js'],
    schema: [],
    messages: {
      staticOnly: 'This class only groups static members and works as a namespace. Prefer standalone functions (plus module-level state when needed) over a class shell.',
    },
  },
  create(context) {
    return {
      ClassDeclaration(node: unknown) {
        check(context, node as TSESTree.ClassDeclaration)
      },
      ClassExpression(node: unknown) {
        check(context, node as TSESTree.ClassExpression)
      },
    }
  },
})
