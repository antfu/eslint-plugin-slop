import type { TSESTree } from '@typescript-eslint/utils'
import type { Rule, Scope } from 'eslint'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

interface Options {
  minimumReferences?: number
}

type FunctionNode
  = | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression

interface Candidate {
  functionNode: FunctionNode
  identifier: TSESTree.Identifier
  reportNode: TSESTree.Node
}

interface ReferenceWithKind extends Scope.Reference {
  isTypeReference?: boolean | (() => boolean)
  isValueReference?: boolean | (() => boolean)
}

function getForwardedParameterNames(node: FunctionNode): Array<{ name: string, rest: boolean }> | null {
  const parameters: Array<{ name: string, rest: boolean }> = []

  for (const parameter of node.params) {
    if (parameter.type === 'Identifier') {
      parameters.push({ name: parameter.name, rest: false })
      continue
    }

    if (parameter.type === 'RestElement' && parameter.argument.type === 'Identifier') {
      parameters.push({ name: parameter.argument.name, rest: true })
      continue
    }

    return null
  }

  return parameters
}

function getSingleExpression(node: FunctionNode): TSESTree.Expression | null {
  if (node.body.type !== 'BlockStatement')
    return node.body
  if (node.body.body.length !== 1)
    return null

  const statement = node.body.body[0]
  if (statement.type === 'ReturnStatement')
    return statement.argument
  if (statement.type === 'ExpressionStatement')
    return statement.expression
  return null
}

function getMemberRoot(node: TSESTree.Expression): TSESTree.Expression {
  let current = node
  while (current.type === 'MemberExpression')
    current = current.object
  return current
}

function isDirectParameterAccess(
  expression: TSESTree.Expression,
  parameters: Array<{ name: string, rest: boolean }>,
): boolean {
  if (expression.type !== 'MemberExpression' || expression.optional)
    return false

  const root = getMemberRoot(expression)
  return root.type === 'Identifier'
    && parameters.some(parameter => !parameter.rest && parameter.name === root.name)
}

function isTransparentCall(
  expression: TSESTree.Expression,
  parameters: Array<{ name: string, rest: boolean }>,
): boolean {
  if (expression.type !== 'CallExpression' || expression.optional || expression.arguments.length !== parameters.length)
    return false

  return expression.arguments.every((argument, index) => {
    const parameter = parameters[index]
    if (parameter.rest)
      return argument.type === 'SpreadElement' && argument.argument.type === 'Identifier' && argument.argument.name === parameter.name
    return argument.type === 'Identifier' && argument.name === parameter.name
  })
}

function isTrivialFunction(node: FunctionNode): boolean {
  if (node.async || node.generator)
    return false

  const parameters = getForwardedParameterNames(node)
  const expression = getSingleExpression(node)
  if (!parameters || !expression)
    return false

  return isDirectParameterAccess(expression, parameters)
    || isTransparentCall(expression, parameters)
}

function collectTopLevelCandidates(program: TSESTree.Program): { candidates: Candidate[], exportedNames: Set<string> } {
  const candidates: Candidate[] = []
  const exportedNames = new Set<string>()

  function collectDeclaration(
    declaration: TSESTree.FunctionDeclaration | TSESTree.VariableDeclaration,
    exported: boolean,
  ): void {
    if (declaration.type === 'FunctionDeclaration' && declaration.id) {
      if (exported)
        exportedNames.add(declaration.id.name)
      candidates.push({
        identifier: declaration.id,
        functionNode: declaration,
        reportNode: declaration,
      })
      return
    }

    if (declaration.type !== 'VariableDeclaration')
      return

    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || !declarator.init)
        continue
      if (declarator.init.type !== 'ArrowFunctionExpression' && declarator.init.type !== 'FunctionExpression')
        continue
      if (exported)
        exportedNames.add(declarator.id.name)
      candidates.push({
        identifier: declarator.id,
        functionNode: declarator.init,
        reportNode: declarator,
      })
    }
  }

  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration?.type === 'FunctionDeclaration' || statement.declaration?.type === 'VariableDeclaration')
        collectDeclaration(statement.declaration, true)
      if (!statement.source && statement.exportKind !== 'type') {
        for (const specifier of statement.specifiers) {
          if (specifier.exportKind !== 'type' && specifier.local.type === 'Identifier')
            exportedNames.add(specifier.local.name)
        }
      }
      continue
    }

    if (statement.type === 'ExportDefaultDeclaration') {
      const declaration = statement.declaration
      if (declaration.type === 'FunctionDeclaration' && declaration.id)
        exportedNames.add(declaration.id.name)
      if (declaration.type === 'Identifier')
        exportedNames.add(declaration.name)
      continue
    }

    if (statement.type === 'FunctionDeclaration' || statement.type === 'VariableDeclaration')
      collectDeclaration(statement, false)
  }

  return { candidates, exportedNames }
}

function sameIdentifier(left: TSESTree.Identifier, right: TSESTree.Identifier): boolean {
  return left.range[0] === right.range[0] && left.range[1] === right.range[1]
}

function contains(outer: TSESTree.Node, inner: TSESTree.Node): boolean {
  return inner.range[0] >= outer.range[0] && inner.range[1] <= outer.range[1]
}

function isTypeOnlyReference(identifier: TSESTree.Identifier): boolean {
  const parent = identifier.parent
  if (!parent?.type.startsWith('TS'))
    return false

  if (
    (parent.type === 'TSAsExpression'
      || parent.type === 'TSInstantiationExpression'
      || parent.type === 'TSNonNullExpression'
      || parent.type === 'TSTypeAssertion')
    && parent.expression === identifier
  ) {
    return false
  }

  return true
}

function countExternalReferences(context: Rule.RuleContext, candidate: Candidate): number {
  const variable = context.sourceCode.scopeManager.scopes
    .flatMap(scope => scope.variables)
    .find(scopeVariable => scopeVariable.identifiers.some((identifier) => {
      return sameIdentifier(identifier as TSESTree.Identifier, candidate.identifier)
    }))

  if (!variable)
    return 0

  return variable.references.filter((reference) => {
    const typedReference = reference as ReferenceWithKind
    const identifier = reference.identifier as TSESTree.Identifier
    if (sameIdentifier(identifier, candidate.identifier) || contains(candidate.functionNode, identifier))
      return false
    if (isTypeOnlyReference(identifier))
      return false
    if (typeof typedReference.isValueReference === 'function')
      return typedReference.isValueReference()
    if (typeof typedReference.isValueReference === 'boolean')
      return typedReference.isValueReference
    if (typeof typedReference.isTypeReference === 'function')
      return !typedReference.isTypeReference()
    return !typedReference.isTypeReference
  }).length
}

export const noTrivialFunctions = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/antfu/eslint-plugin-slop/blob/main/src/rules/no-trivial-functions.md',
      description: 'Disallow low-use top-level forwarding and property-access functions.',
    },
    languages: ['js/js'],
    schema: [{
      type: 'object',
      additionalProperties: false,
      properties: {
        minimumReferences: { type: 'integer', minimum: 1 },
      },
    }],
    defaultOptions: [{ minimumReferences: 5 }],
    messages: {
      trivial: 'This top-level trivial function has {{count}} external references; the configured minimum is {{minimum}}. Inline it or give the abstraction a broader role.',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as Options
    const minimumReferences = options.minimumReferences ?? 5

    return {
      'Program:exit': (program) => {
        const { candidates, exportedNames } = collectTopLevelCandidates(program as TSESTree.Program)
        for (const candidate of candidates) {
          if (exportedNames.has(candidate.identifier.name) || !isTrivialFunction(candidate.functionNode))
            continue

          const count = countExternalReferences(context, candidate)
          if (count >= minimumReferences || !isReportEligible(context, candidate.reportNode))
            continue

          context.report({
            node: candidate.reportNode as never,
            messageId: 'trivial',
            data: { count, minimum: minimumReferences },
          })
        }
      },
    }
  },
})
