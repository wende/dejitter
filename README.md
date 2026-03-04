# Dejitter

A browser-injectable animation frame recorder that captures every `requestAnimationFrame` at full speed, then downsamples intelligently and auto-detects visual anomalies.

## What it does

- **Records** computed style changes, bounding rects, scroll positions, and DOM mutations across all (or selected) elements at full rAF speed
- **Downsamples** output to a configurable sample rate — rare discrete changes are kept as-is, continuous properties are evenly sampled
- **Analyzes** recordings to detect jitter, flicker, shiver (oscillation), sudden jumps, and statistical outliers
- **Reports** findings with severity levels, element identification, and detailed metadata

## Install as Claude Code plugin

```
/plugin marketplace add wende/dejitter
/plugin install dejitter@wende-dejitter
```

Then use `/dejitter` in any conversation to get injection and usage instructions.

## Quick start (manual)

Inject into any page:

```js
const s = document.createElement('script');
s.src = 'http://localhost:8787/recorder.js';
document.head.appendChild(s);
```

Serve the file locally:

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```

Then use the floating UI button or the console API:

```js
dejitter.configure({
  selector: '.chat-container',
  props: ['transform', 'opacity', 'boundingRect'],
});
dejitter.start();
// ... interact with the page ...
dejitter.stop();
dejitter.findings();  // YAML report of detected anomalies
```

## API

| Method | Description |
|--------|-------------|
| `configure(opts)` | Set selector, props, sampleRate, maxDuration, etc. |
| `start()` | Begin recording at full rAF speed |
| `stop()` | Stop recording, fire onStop callbacks |
| `onStop(callback)` | Register a callback to run after stop |
| `findings(raw?)` | Auto-detected anomalies (YAML default, pass `true` for array) |
| `summary(raw?)` | Recording stats (YAML default, pass `true` for object) |
| `getData()` | Full export: samples, elements, propStats, mutations |
| `toJSON()` | JSON string of `getData()` |
| `getRaw()` | Raw unprocessed frames and mutations |

## Detection types

| Type | What it catches |
|------|----------------|
| **jitter** | Property bounces from rest state and returns — layout thrashing |
| **flicker** | Opacity-specific bounce — element appears/disappears |
| **shiver** | High-frequency oscillation — two forces fighting (e.g. scroll vs overscroll) |
| **jump** | Single-frame discontinuity far exceeding typical delta |
| **outlier** | Property changing at statistically unusual rate vs siblings |

## Configuration

```js
dejitter.configure({
  selector: '*',        // CSS selector for elements to track
  props: ['opacity', 'transform'],  // properties to sample
  sampleRate: 15,       // target output samples/sec
  maxDuration: 10000,   // auto-stop after ms (0 = manual)
  minTextLength: 0,     // ignore elements with short text
  mutations: false,     // observe DOM mutations
  idleTimeout: 2000,    // auto-stop after idle ms (0 = off)
});
```

### Special props

- `'boundingRect'` — tracks `getBoundingClientRect()` (x, y, width, height)
- `'scroll'` — tracks `scrollTop` and `scrollHeight`
- `'textContent'` — tracks text length changes
- `'--custom-var'` — any CSS custom property
- Any standard CSS property (e.g. `'transform'`, `'opacity'`, `'top'`)

## How downsampling works

Recording always runs at full `requestAnimationFrame` speed. On data export:

1. Properties with **zero changes** → dropped entirely
2. Properties with **fewer changes than target** → kept as-is (anomalies / rare discrete events)
3. Properties with **more changes than target** → evenly downsampled to target frame count

This preserves important moments while keeping output manageable.

## License

MIT
