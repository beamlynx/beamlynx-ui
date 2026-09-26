CPU throttle 4x, 60 columns, 5 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10000 | mui (shipped: freeze+remount) | 284 / 303 | 257 / 276 | 126 / 134 | 112 / 120 | 2 / 3 | 7 / 9 | 0 / 0 | 33 / 33 | 57 / 69 | 576 |
| 10000 | mui (live resize) | 280 / 291 | 255 / 265 | 43 / 57 | 0 / 0 | 0 / 0 | 7 / 7 | 0 / 0 | 33 / 50 | 68 / 113 | 576 |
| 10000 | tanstack (live resize) | 198 / 199 | 166 / 176 | 0 / 0 | 0 / 0 | 0 / 0 | 60 / 64 | 0 / 0 | 117 / 133 | 94 / 101 | 2016 |
| 10000 | pool (live resize) | 309 / 343 | 292 / 327 | 0 / 1 | 0 / 0 | 0 / 0 | 35 / 37 | 0 / 0 | 100 / 100 | 126 / 128 | 2382 |
| 10000 | glide (live resize) | 34 / 36 | 45 / 50 | 18 / 32 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 29 | 17 | 0 |
| 10000 | 246 | 151 | 0 |
| 100000 | 2643 | 1461 | 12 |
