GPU rendering, CPU throttle 4x, viewport 1600x900 @1x, 60 columns, 3 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10000 | mui (shipped: freeze+remount) | 292 / 297 | 265 / 269 | 128 / 134 | 110 / 121 | 2 / 3 | 9 / 9 | 0 / 0 | 33 / 33 | 64 / 65 | 576 |
| 10000 | mui (live resize) | 292 / 318 | 264 / 288 | 44 / 61 | 0 / 0 | 0 / 1 | 8 / 9 | 0 / 0 | 33 / 33 | 61 / 69 | 576 |
| 10000 | tanstack (live resize) | 204 / 206 | 172 / 174 | 0 / 0 | 0 / 0 | 0 / 0 | 62 / 64 | 0 / 0 | 100 / 117 | 95 / 96 | 2016 |
| 10000 | pool (live resize) | 315 / 323 | 299 / 306 | 0 / 3 | 0 / 0 | 0 / 0 | 37 / 37 | 0 / 0 | 100 / 100 | 127 / 131 | 2382 |
| 10000 | glide (live resize) | 34 / 36 | 43 / 44 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 28 | 16 | 0 |
| 10000 | 242 | 156 | 0 |
| 100000 | 2641 | 1476 | 12 |
