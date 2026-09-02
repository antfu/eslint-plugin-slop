# prefer-jsdoc

Require `/** */` rather than `//` for the comment documenting an export or a member.

## Rule details

Editors show `/** */` blocks in hover tooltips and completions. A `//` comment above an export or a member is documentation nobody sees at the call site.

The rule fires on a `//` comment directly above:

- an exported declaration (`export function`, `export const`, `export default`, and so on)
- an interface or type-literal member
- an object literal property
- a class member
- an enum member

A blank line between the comment and the target does not break the association; code or a block comment does. The fix converts the `//` run into a JSDoc block and closes any blank-line gap. A single `//` line becomes a one-liner (`/** does X */`); a run of lines becomes a multi-line block.

Two comments are never converted: license and copyright headers (`Copyright`, `License`, `SPDX`, `©`), and a file header separated from the export by a blank line, because it describes the module rather than the export below it. Directive comments (`eslint`, `ts-`, and the like) are left alone.

```ts
// bad
// Parses the config file
export function parseConfig(path) {}

interface RecordOptions {
  // run without a window
  headless: boolean
}

// good
/**
 * Parses the config file
 */
export function parseConfig(path) {}

interface RecordOptions {
  /** run without a window */
  headless: boolean
}
```

## Options

None.
