# no-chained-type-assertions

Disallow nested TypeScript type assertions that discard type evidence.

## Rule details

The rule reports the outer expression once when two or more `as` assertions or angle-bracket assertions are nested. A chain made entirely of `as const` assertions is allowed.

```ts
// bad
const user = input as unknown as User
const config = <Config><unknown>input

// good: one assertion
const user = input as User

// better: validate the boundary
const user = parseUser(input)
```

The diagnostic recommends preserving the precise source type or parsing untrusted input before narrowing it.
