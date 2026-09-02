# max-comment-length

Limit logical comment blocks by word count.

## Rule details

The rule groups directly adjacent `//` comments into one logical block. A blank line or code separates blocks. Block comments are counted individually.

The first comment block before the first code token is treated as a file header and may exceed the limit. A shebang may appear before that header. JSDoc blocks are ignored by default.

```ts
const value = loadValue()

// bad with maximumWords: 8
// This comment repeats the implementation and explains every obvious operation in unnecessary detail.
useValue(value)

// good
// Keep this fallback for data written before schema version 2.
useLegacyValue(value)
```

## Options

```ts
createSlopConfig({
  rules: {
    'slop/max-comment-length': ['error', {
      maximumWords: 40,
      ignoreJSDoc: true,
    }],
  },
})
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `maximumWords` | positive integer | `50` | Maximum words in one logical comment block. |
| `ignoreJSDoc` | boolean | `true` | Exclude complete JSDoc blocks from the word limit. |
