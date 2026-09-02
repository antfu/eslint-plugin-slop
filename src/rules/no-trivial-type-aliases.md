# no-trivial-type-aliases

Disallow top-level TypeScript aliases that add no structure to a primitive or `unknown`.

## Rule details

The rule resolves top-level aliases through other aliases declared in the same file. It reports an alias when the chain ends at `unknown` or one of these primitive types: `bigint`, `boolean`, `null`, `number`, `string`, `symbol`, `undefined`.

Exported aliases are checked because an export does not add type information.

```ts
// bad
type UserId = string
type AccountId = UserId
type Unchecked = unknown

// good: adds a nominal distinction
type UserId = string & { readonly __brand: unique symbol }

// good: adds a constraint
type Status = 'open' | 'closed'

// good: cannot be resolved from syntax in this file
type ExternalId = ImportedId
```

Generic aliases, unions, intersections, arrays, tuples, and unresolved references are allowed. The rule only follows syntax in the current file and does not use TypeScript type information.

For a primitive alias, the diagnostic recommends using the primitive directly or adding a real constraint or brand. For an `unknown` alias, it recommends keeping `unknown` visible until the value is parsed or narrowed.
