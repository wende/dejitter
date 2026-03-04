# Future: Track class list changes

## Problem

React apps drive visual state by toggling classes (`hidden`, `animate-*`, `is-streaming`).
The recorder currently catches the *effect* (opacity going to 0) but not the *cause*
(class `hidden` being added). This makes it hard to correlate state transitions with
visual changes when debugging.

## What it would look like

A new virtual prop like `'classList'` that diffs the element's `className` between samples
and emits only added/removed classes:

```js
{ id: "e7", "cls+": ["is-streaming"], "cls-": ["idle"] }
```

## Why not yet

- Most use cases are covered by tracking computed styles + mutations
- Class changes are high-frequency noise on many elements (Tailwind generates long class strings)
- Need a good filtering strategy first (e.g. only track classes matching a pattern)

## When it becomes worth it

- Debugging animations that are triggered by class toggling (e.g. `animate-fadeIn` added/removed)
- Understanding React state → visual mapping without reading component source
- Cases where computed style deltas alone don't explain what happened
