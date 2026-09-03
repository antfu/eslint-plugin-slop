# no-static-only-class

Disallow classes that group only static members.

## Rule details

A class whose members are all static carries no instance state and no polymorphism. It works as a namespace, and plain module-level functions (plus module-level state when needed) express the same thing with less ceremony.

```ts
// bad
class StringUtils {
  static capitalize(value: string) {
    return value[0].toUpperCase() + value.slice(1)
  }
}

// good
export function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1)
}
```

The rule reports the class name (or the whole anonymous class) when every member is `static`. An empty parameterless constructor is ignored as boilerplate, but a constructor with parameters — including TypeScript parameter properties — creates instance state and keeps the class allowed.

Classes stay allowed when they play a real type or framework role:

- a superclass (`extends`) or interface (`implements`)
- decorators on the class or any member
- an `abstract` or `declare` modifier
- a static block, which runs at class definition time
- any instance member

The rule has no autofix: extracting members to module scope rewrites every call site and needs author judgment.

```ts
// bad
const format = class {
  static money(value: number) {
    return value.toFixed(2)
  }
}

// good
export function formatMoney(value: number) {
  return value.toFixed(2)
}
```
