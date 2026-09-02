# no-trivial-functions

Disallow low-use top-level functions that only forward arguments or read a property.

## Rule details

The rule checks top-level function declarations and functions assigned to top-level variables. It reports a function when all of these conditions hold:

- Its body is one expression or one returned expression.
- The expression is a direct property access from a parameter, or a call that forwards every parameter unchanged.
- The function has fewer external value references than `minimumReferences`.
- The function is not part of the public ESM interface through a direct export, a later named export, or a default export.

Recursive references inside the function and type-only references do not count. Nested functions, async functions, generators, functions with transformations, and functions with added behavior are allowed.

```ts
// bad
const getName = user => user.profile.name
const parse = value => parseValue(value)

// good: adds a transformation
const normalize = value => parseValue(value.trim())

// good: public ESM interface
export const getName = user => user.profile.name
```

The diagnostic recommends inlining the function or giving the abstraction a broader role.

## Options

```ts
createSlopConfig({
  rules: {
    'slop/no-trivial-functions': ['error', {
      minimumReferences: 3,
    }],
  },
})
```

`minimumReferences` is a positive integer and defaults to `5`. A function with exactly that many external value references is allowed.
