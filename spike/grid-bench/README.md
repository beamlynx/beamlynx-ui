# Results grid bench (spike)

Throwaway harness for choosing a replacement for the results grid's
`@mui/x-data-grid`. Not part of the app, and not meant to be merged. The plan
it serves is `beamlynx-plans/completed/2026-09-19-evaluate-results-grid-library.md`.

It renders the same deterministic, join-shaped data in each candidate grid.
It then measures main-thread work while a sibling panel opens and closes
beside the grid, as the Settings panel does in the app.

## Candidates

| `lib=` | What it is |
|---|---|
| `mui` | `@mui/x-data-grid` 7.29.13, configured and styled as `Result.tsx` does |
| `tanstack` | Our own DOM rows, virtualized by `@tanstack/react-virtual` |
| `lynx` | Our own DOM rows, hand-rolled virtualization that re-renders in 8-row chunks |
| `pool` | Our own DOM rows with no React in the body: a recycled pool of row elements |
| `glide` | `@glideapps/glide-data-grid` 6.0.3, canvas-rendered |
| `ag` | AG Grid Community 36.2 |

## Running

```sh
npm install
npm run build
node bench/run.mjs --gpu           # full matrix: 100/1k/10k/100k rows, 5 runs each, 4x CPU throttle
node bench/run.mjs --quick         # one run each at 1k rows
node bench/run.mjs --gpu --libs=pool,glide --rows=10000 --cols=60 --dpr=2 --width=2560 --height=1440 --tag=wide
node bench/features.mjs            # edit, JSON click, context menu, resize-survives-remount
```

The bench needs a Chromium binary. It defaults to Playwright's cached
`chromium-1243`. Set `CHROME=/path/to/chrome` to use another.

Always pass `--gpu`. Without it, headless Chromium renders with SwiftShader:
canvas and rasterization in software, on the main thread the CPU throttle
slows. That is not how the app runs, and it makes a canvas grid look far
worse than it is at 2×. It is still a useful worst case: a machine whose GPU
driver Chromium blocklists falls back to the same thing.

Summaries land in `results/*.md`. Files with `gpu` in the name are the GPU
runs; the rest are software-rendered.

## What is measured

- **mount**: from rendering the grid to two animation frames later, plus
  main-thread blocked time over the following second.
- **resize**: one open and close of a 640px sibling panel with a 200ms width
  transition. `freeze=1` reproduces the shipped behavior: the pane is pinned
  and the grid unmounted, then remounted once the panel has settled.
  `freeze=0` lets the grid resize on every frame.
- **scroll**: 90 frames at 120px per frame, then a jump to the bottom,
  the middle and the top. A frame counts as "blank" if it painted with no
  row under the sample point.
- **swap**: replacing the result with a new one of the same size.
- **blocked ms**: how late back-to-back `setTimeout(0)` calls fire, counting
  anything past 16ms. This is the metric the original investigation used.
- **long tasks**: `PerformanceObserver` long-task entries (over 50ms).
- **data path**: the MobX cost of storing rows the way
  `default.plugin.tsx` does, and of `toJS` as `Result.tsx` calls it.
