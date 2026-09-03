# no-em-dash

Disallow literal em dashes in source text.

## Rule details

This rule checks the complete text exposed by the configured ESLint parser or language plugin. It reports the whole sentence surrounding each literal U+2014 character (bounded by sentence-ending punctuation or line breaks), so the fix is to rephrase the sentence rather than swap the dash. This applies to code, strings, comments, Markdown, and other parser-compatible languages.

Escaped text such as `\u2014`, adjacent hyphens (`--`), and en dashes (`–`) are allowed. The rule has no autofix because rewriting prose needs author judgment.

```ts
// bad
const summary = 'The input parses — it still needs validation'

// good
const summary = 'The input parses, but it still needs validation'

// good
const summary = 'The input parses. It still needs validation.'
```

The diagnostic highlights the full sentence and asks the author to shorten or rephrase it instead of replacing punctuation mechanically. Multiple em dashes within one sentence produce a single report.
