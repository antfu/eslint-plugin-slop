import type { TSESTree } from '@typescript-eslint/utils'
import { isReportEligible } from '../utils/git-inspection'
import { defineRule } from '../utils/rule'

type TerminalKind = 'primitive' | 'unknown'

const primitiveTypes = new Set([
  'TSBigIntKeyword',
  'TSBooleanKeyword',
  'TSNullKeyword',
  'TSNumberKeyword',
  'TSStringKeyword',
  'TSSymbolKeyword',
  'TSUndefinedKeyword',
])

function collectAliases(program: TSESTree.Program): Map<string, TSESTree.TSTypeAliasDeclaration> {
  const aliases = new Map<string, TSESTree.TSTypeAliasDeclaration>()

  for (const statement of program.body) {
    const declaration = statement.type === 'ExportNamedDeclaration'
      ? statement.declaration
      : statement
    if (declaration?.type === 'TSTypeAliasDeclaration')
      aliases.set(declaration.id.name, declaration)
  }

  return aliases
}

function resolveTerminal(
  alias: TSESTree.TSTypeAliasDeclaration,
  aliases: Map<string, TSESTree.TSTypeAliasDeclaration>,
  seen: Set<string>,
): TerminalKind | null {
  if (alias.typeParameters?.params.length)
    return null

  const annotation = alias.typeAnnotation
  if (annotation.type === 'TSUnknownKeyword')
    return 'unknown'
  if (primitiveTypes.has(annotation.type))
    return 'primitive'
  if (annotation.type !== 'TSTypeReference' || annotation.typeName.type !== 'Identifier' || annotation.typeArguments)
    return null
  if (seen.has(annotation.typeName.name))
    return null

  const referencedAlias = aliases.get(annotation.typeName.name)
  if (!referencedAlias)
    return null

  seen.add(annotation.typeName.name)
  return resolveTerminal(referencedAlias, aliases, seen)
}

export const noTrivialTypeAliases = defineRule({
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow type aliases that resolve only to a primitive or unknown.',
    },
    languages: ['js/js'],
    schema: [],
    messages: {
      primitive: 'This alias adds no structure to its primitive type. Use the primitive directly, or add a real constraint or brand.',
      unknown: 'This alias hides missing type evidence. Keep unknown visible at the boundary, then parse or narrow it before use.',
    },
  },
  create(context) {
    return {
      'Program:exit': (program) => {
        const aliases = collectAliases(program as TSESTree.Program)
        for (const alias of aliases.values()) {
          const terminal = resolveTerminal(alias, aliases, new Set([alias.id.name]))
          if (!terminal || !isReportEligible(context, alias))
            continue

          context.report({
            node: alias as never,
            messageId: terminal,
          })
        }
      },
    }
  },
})
