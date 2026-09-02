# no-em-dash

Disallow literal em dashes in source text.

## Rule details

This rule checks the complete text exposed by the configured ESLint parser or language plugin. It reports each literal U+2014 character, including characters in code, strings, comments, Markdown, and other parser-compatible languages.

Escaped text such as `\u2014`, adjacent hyphens (`--`), and en dashes (`–`) are allowed. The rule has no autofix because rewriting prose needs author judgment.

```ts
// bad
const summary = 'The input parses — it still needs validation'

// good
const summary = 'The input parses, but it still needs validation'

// good
const summary = 'The input parses. It still needs validation.'
```

The diagnostic asks the author to shorten or rephrase the sentence instead of replacing punctuation mechanically.
