import { maxCommentLength } from './max-comment-length'
import { noChainedTypeAssertions } from './no-chained-type-assertions'
import { noEmDash } from './no-em-dash'
import { noJargon } from './no-jargon'
import { noStaticOnlyClass } from './no-static-only-class'
import { noTrivialFunctions } from './no-trivial-functions'
import { noTrivialTypeAliases } from './no-trivial-type-aliases'
import { preferJsdoc } from './prefer-jsdoc'

export const rules = {
  'max-comment-length': maxCommentLength,
  'no-chained-type-assertions': noChainedTypeAssertions,
  'no-em-dash': noEmDash,
  'no-jargon': noJargon,
  'no-static-only-class': noStaticOnlyClass,
  'no-trivial-functions': noTrivialFunctions,
  'no-trivial-type-aliases': noTrivialTypeAliases,
  'prefer-jsdoc': preferJsdoc,
}
