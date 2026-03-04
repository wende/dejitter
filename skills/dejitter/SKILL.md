---
name: dejitter
description: Inject the Dejitter animation recorder into a browser page to detect jitter, flicker, shiver, jumps, and layout anomalies. Use when debugging visual glitches or animation issues.
---

# Dejitter — Animation Recorder & Jank Detector

## Step 1. Serve and inject

The recorder script is bundled with this plugin. First find where it's cached, serve it, then inject:

```bash
# Find the plugin cache path and serve it (once per session)
find ~/.claude/plugins -name 'recorder.js' -path '*/dejitter/*' -print -quit
# Then cd to the directory containing recorder.js and serve:
# cd <that directory> && python3 -m http.server 8787 --bind 127.0.0.1 &
```

Then inject via `evaluate_script` or equivalent:

```js
const s = document.createElement('script');
s.src = 'http://localhost:8787/recorder.js';
document.head.appendChild(s);
```

> The script does not survive page refreshes. Re-inject after each navigation.

## Step 2. Configure

```js
dejitter.configure({
  selector: '.chat-container, .message',  // CSS selector (default: '*')
  props: ['transform', 'opacity', 'boundingRect'],  // properties to sample
  sampleRate: 15,       // target output samples/sec (default: 15)
  maxDuration: 10000,   // auto-stop after ms, 0 = manual (default: 10000)
  minTextLength: 0,     // ignore elements with shorter text (default: 0)
  mutations: false,     // observe DOM mutations (default: false)
  idleTimeout: 2000,    // auto-stop after ms of no changes, 0 = off (default: 2000)
  thresholds: {         // anomaly detection sensitivity (override individual values)
    jitter:  { minDeviation: 1, maxDuration: 1000, highSeverity: 20, medSeverity: 5 },
    shiver:  { minReversals: 5, minDensity: 0.3, highDensity: 0.7, medDensity: 0.5, minDelta: 0.01 },
    jump:    { medianMultiplier: 10, minAbsolute: 50, highMultiplier: 50, medMultiplier: 20 },
    stutter: { velocityRatio: 0.3, maxFrames: 3, minVelocity: 0.5 },
    outlier: { ratioThreshold: 3 },
  },
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

Finding types:
- **jitter** — property bounces from rest → deviation → rest (layout thrashing)
- **flicker** — opacity-specific bounce (element appears/disappears)
- **shiver** — high-frequency oscillation with many direction reversals (two forces fighting)
- **jump** — single-frame discontinuity far larger than typical delta
- **stutter** — brief mid-motion direction reversal (1–3 frames) during smooth movement
- **outlier** — property changes at unusual rate vs siblings on same element

Severities: `high`, `medium`, `low`, `info`

### Summary & export

```js
dejitter.summary()       // → YAML string (pass true for raw object)
dejitter.getData()       // → full object with samples, elements, propStats, mutations
dejitter.toJSON()        // → JSON string of getData()
dejitter.getRaw()        // → { rawFrames, mutations } (unprocessed)
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

## Tips for AI Agents

### Trust the frame count, not the findings count
- If `rawFrameCount` is < 10 after a multi-second interaction, **the recorder is not working**. Do NOT conclude "no anomalies" — diagnose why frames aren't being captured.
- A working recording during active UI changes should produce dozens to hundreds of frames.

### Keep selectors minimal
- Start with the **one container element** that matters (e.g., `'main'` for a scrollable chat).
- NEVER use broad attribute selectors like `[class*="flex"]` — matching hundreds of elements causes layout thrashing that creates artificial anomalies (observer effect).
- Add more selectors only after confirming the recorder is capturing frames.

### Timing matters
- The recorder has an `idleTimeout` — if no DOM changes happen within that window after `start()`, it auto-stops.
- Minimize delay between `dejitter.start()` and the user interaction that triggers animation. Do both in the same `evaluate_script` call if possible, or send the message immediately after starting.
- Set `idleTimeout` high (5000-10000ms) when tool call roundtrips add latency before the interaction begins.

### When results look wrong, debug the tool first
- Check `dejitter.getRaw()` mid-recording to verify frames are accumulating.
- Check `dejitter.summary()` for `elementsTracked` — if 0, your selector matched nothing.
- If frame count is stuck at 1, the recorder captured the initial snapshot but never detected changes. The elements may not be changing the tracked props, or the recorder may have auto-stopped.
