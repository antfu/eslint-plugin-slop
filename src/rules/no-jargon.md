# no-jargon

Disallow inflated vocabulary in comments.

## Rule details

Some words rarely appear in a comment a person actually typed. The default list stays short on purpose, only the reliable tells, so a hit is worth acting on. Simple inflections match too, so `utilizes` and `delving` do not slip past.

The default list catches words like `utilize`, `leverage`, `robust`, and `streamline`. See [`defaultJargonWords`](./no-jargon.ts) for the full list, which is also exported from the package.

A word inside backticks or double quotes never fires, so a comment can name the word itself. Where a clean swap exists (`utilize` → `use`) the rule offers an editor suggestion; wording changes never autofix.

```ts
// bad
// utilize the robust cache to streamline lookups

// good
// use the cache
```

## Options

```ts
createSlopConfig({
  rules: {
    'slop/no-jargon': ['error', {
      extraWords: ['synergy'],
      allow: ['robust'],
    }],
  },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `words` | string[] | the default list | Replace the word list. |
| `extraWords` | string[] | `[]` | Add words to the list. |
| `allow` | string[] | `[]` | Remove words from the list. |
| `ignoreJSDoc` | boolean | `false` | Skip `/** */` blocks. |
