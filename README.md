# eslint-plugin-slop

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

ESLint rules for guarding AI slops in code.

## Usage

`createSlopConfig()` enables every rule as an error. It inspects recent changes by default.

```ts
import { createSlopConfig } from 'eslint-plugin-slop'

export default [
  ...createSlopConfig(),
]
```

The constructor returns two flat config entries. The universal entry enables `no-em-dash` for every language in the surrounding ESLint config. The JavaScript entry enables the syntax rules for `js`, `mjs`, `cjs`, `jsx`, `ts`, `mts`, `cts`, and `tsx` files.

The consumer supplies parsers and language plugins. Linting Markdown, for example, requires a Markdown language plugin in the same ESLint config.

### Inspection modes

```ts
createSlopConfig({
  cwd: import.meta.dirname,
  inspection: {
    mode: 'recent-changes',
    tracebackCommits: 5,
  },
})
```

- `recent-changes` compares the exact linted text with `HEAD~tracebackCommits`. It includes committed, staged, unstaged, untracked, and unsaved changes. The default traceback is five commits.
- `uncommitted` compares the exact linted text with `HEAD`. It includes staged, unstaged, untracked, and unsaved changes.
- `full` inspects the complete file.

A bare mode string is shorthand for `{ mode }`, so `inspection: 'full'` equals `inspection: { mode: 'full' }`.

Recent modes report a construct only when its current range intersects an added or modified line in the net diff. If Git is unavailable, the file sits outside the repository, or the requested history is unavailable, the rules inspect the complete file.

### Per-rule overrides

Every rule accepts the global props (`cwd`, `inspection`) in its own options entry, overriding the shared config for that rule alone. The shorthand works here too.

```ts
createSlopConfig({
  inspection: 'recent-changes',
  rules: {
    // Always scan the whole file for em dashes, ignoring the global inspection.
    'slop/no-em-dash': ['error', { inspection: 'full' }],
    'slop/max-comment-length': ['error', { maximumWords: 40, inspection: 'uncommitted' }],
  },
})
```

### Rule overrides

Rule overrides use normal flat config entries.

```ts
createSlopConfig({
  rules: {
    'slop/max-comment-length': ['error', { maximumWords: 40 }],
    'slop/no-trivial-functions': ['error', { minimumReferences: 3 }],
    'slop/no-em-dash': 'off',
  },
})
```

The default export is the raw ESLint plugin object. It has `meta` and `rules`, with no bundled configs. A raw configuration with no `settings.slop` uses full inspection.

## Rules

| Rule | Reports | Options |
| --- | --- | --- |
| [`slop/no-em-dash`](./src/rules/no-em-dash.md) | Each literal U+2014 character in any parser-compatible language | None |
| [`slop/no-trivial-functions`](./src/rules/no-trivial-functions.md) | Low-use top-level property access or transparent forwarding functions that are not exported through ESM | `minimumReferences`, default `5` |
| [`slop/max-comment-length`](./src/rules/max-comment-length.md) | Logical comment blocks over a word limit | `maximumWords`, default `50`; `ignoreJSDoc`, default `true` |
| [`slop/no-jargon`](./src/rules/no-jargon.md) | Inflated vocabulary in comments, with editor suggestions where a clean swap exists | `words`; `extraWords`; `allow`; `ignoreJSDoc`, default `false` |
| [`slop/prefer-jsdoc`](./src/rules/prefer-jsdoc.md) | A `//` comment documenting an export or member, autofixed to `/** */` | None |
| [`slop/no-trivial-type-aliases`](./src/rules/no-trivial-type-aliases.md) | Top-level TypeScript aliases that resolve through same-file chains to `unknown` or a primitive | None |
| [`slop/no-static-only-class`](./src/rules/no-static-only-class.md) | Classes that group only static members and act as namespaces instead of abstractions | None |
| [`slop/no-chained-type-assertions`](./src/rules/no-chained-type-assertions.md) | Two or more nested TypeScript assertions, except chains made entirely of `as const` | None |

`max-comment-length` groups directly adjacent line comments. A blank line or code separates groups. The first comment block before the first code token is a file header. A shebang may come before it.

`no-trivial-functions` counts external value references. It excludes the declaration, recursive references inside the function, and type-only references. Direct and later ESM exports remain allowed.

`no-jargon` matches simple inflections, so `utilizes` and `delving` are caught. A word inside backticks or double quotes never fires. The default word list is exported as `defaultJargonWords`.

`prefer-jsdoc` fires on a `//` run directly above an export or a member (interface and type-literal members, object properties, class members, enum members). A blank line does not break the association; code or a block comment does. License headers and directive comments are left alone.

`no-static-only-class` reports a class when every member is `static`, ignoring an empty boilerplate constructor. Classes with a superclass, `implements`, decorators, an `abstract` or `declare` modifier, a static block, or any instance member stay allowed.

## Credits

The rule selection and package organization draw from these projects.

- [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) cataloged recurring low-value patterns.
- [Coderrob/eslint-config-zero-tolerance](https://github.com/Coderrob/eslint-config-zero-tolerance) showed the value of a small strict rule set.
- [jantimon/eslint-plugin-no-comment-slop](https://github.com/jantimon/eslint-plugin-no-comment-slop) inspired `no-jargon` and `prefer-jsdoc`, including the default jargon list and the license-header and directive exclusions.

The rule implementations here are original and follow the narrower behavior documented above.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg" alt="Sponsors"/>
  </a>
</p>

## License

[MIT](./LICENSE.md) License © [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/eslint-plugin-slop?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmx.dev/package/eslint-plugin-slop
[npm-downloads-src]: https://img.shields.io/npm/dm/eslint-plugin-slop?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmx.dev/package/eslint-plugin-slop
[bundle-src]: https://img.shields.io/bundlephobia/minzip/eslint-plugin-slop?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=eslint-plugin-slop
[license-src]: https://img.shields.io/github/license/antfu/eslint-plugin-slop.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/eslint-plugin-slop/blob/main/LICENSE.md
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/eslint-plugin-slop
