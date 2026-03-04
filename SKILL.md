# Dejitter — Usage Guide

## Step 1. Initialization

Start the static file server (once per session):

```bash
cd /Users/wende/projects/dejitter && python3 -m http.server 8787 --bind 127.0.0.1 &
```

After navigating to a page, inject the recorder:

```js
// evaluate_script
const s = document.createElement('script');
s.src = 'http://localhost:8787/recorder.js';
document.head.appendChild(s);
```

> Note: The script does not survive page refreshes. Re-inject after each navigation.

## Step 2. Configure

Call `configure()` before recording to set what to track:

```js
dejitter.configure({
  selector: '.chat-container, .message',  // CSS selector (default: '*')
  props: ['transform', 'opacity', 'boundingRect'],  // properties to sample
  sampleRate: 15,       // target output samples/sec (default: 15)
  maxDuration: 10000,   // auto-stop after ms, 0 = manual (default: 10000)
  minTextLength: 0,     // ignore elements with shorter text (default: 0)
  mutations: false,     // observe DOM mutations (default: false)
  idleTimeout: 2000,    // auto-stop after ms of no changes, 0 = off (default: 2000)
});
```

### Special props

| Prop             | What it tracks                                      |
|------------------|-----------------------------------------------------|
| `'boundingRect'` | `getBoundingClientRect()` → `rect.x`, `rect.y`, `rect.w`, `rect.h` |
| `'scroll'`       | `scrollTop`, `scrollHeight` on matched elements     |
| `'textContent'`  | `innerText` length changes (`textLen`)               |
| `'--custom-var'` | Any CSS custom property                              |
| Any CSS prop     | Computed style value (e.g. `'transform'`, `'opacity'`) |

## Step 3. Record

```js
dejitter.start();
// ... interact with the page (scroll, click, wait for animations) ...
dejitter.stop();
```

Or use the floating UI button (injected automatically in the top-right corner).

## Step 4. Analyze

### Findings (anomaly detection)

```js
dejitter.findings()      // → YAML string (default)
dejitter.findings(true)  // → raw array of finding objects
```

Finding types detected:
- **jitter** — property bounces from rest → deviation → rest (layout thrashing)
- **flicker** — opacity-specific bounce (element appears/disappears)
- **shiver** — high-frequency oscillation with many direction reversals (two forces fighting)
- **jump** — single-frame discontinuity far larger than typical delta
- **outlier** — property changes at unusual rate vs siblings on same element

Severities: `high`, `medium`, `low`, `info`

### Summary

```js
dejitter.summary()       // → YAML string
dejitter.summary(true)   // → raw object
```

### Full data export

```js
dejitter.getData()   // → full object with samples, elements, propStats, mutations
dejitter.toJSON()    // → JSON string of getData()
dejitter.getRaw()    // → { rawFrames, mutations } (unprocessed, for debugging)
```

## Typical workflow

```js
// 1. Configure for the page under test
dejitter.configure({
  selector: '[class*="message"], [class*="chat"], main',
  props: ['transform', 'opacity', 'boundingRect'],
  mutations: true,
  maxDuration: 8000,
});

// 2. Record
dejitter.start();
// ... scroll, trigger animations, wait ...
// Recording auto-stops after idle or maxDuration

// 3. Check findings
dejitter.findings()
// Look for high-severity jitters, shivers, or jumps

// 4. Get details if needed
dejitter.summary()
dejitter.getData()
```

## Tips

- Use `selector: '*'` sparingly — it tracks every DOM element and generates noise
- `boundingRect` is the most useful prop for detecting layout jank
- `mutations: true` helps correlate DOM changes with visual glitches
- The UI button shows a findings summary (count by severity) after stopping
- `onStop(callback)` lets you register hooks that fire after recording ends
