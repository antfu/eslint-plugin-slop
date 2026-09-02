import { maxCommentLength } from './max-comment-length'
import { noChainedTypeAssertions } from './no-chained-type-assertions'
import { noEmDash } from './no-em-dash'
import { noTrivialFunctions } from './no-trivial-functions'
import { noTrivialTypeAliases } from './no-trivial-type-aliases'

export const rules = {
  'max-comment-length': maxCommentLength,
  'no-chained-type-assertions': noChainedTypeAssertions,
  'no-em-dash': noEmDash,
  'no-trivial-functions': noTrivialFunctions,
  'no-trivial-type-aliases': noTrivialTypeAliases,
}
