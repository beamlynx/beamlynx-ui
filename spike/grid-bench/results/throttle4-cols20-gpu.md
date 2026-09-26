GPU rendering, CPU throttle 4x, viewport 1600x900 @1x, 20 columns, 3 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1000 | mui (shipped: freeze+remount) | 318 / 328 | 291 / 300 | 113 / 144 | 51 / 126 | 2 / 4 | 7 / 8 | 0 / 0 | 50 / 50 | 41 / 55 | 576 |
| 1000 | mui (live resize) | 301 / 309 | 276 / 280 | 55 / 71 | 0 / 0 | 0 / 1 | 8 / 9 | 0 / 0 | 50 / 50 | 35 / 35 | 576 |
| 1000 | tanstack (live resize) | 123 / 125 | 91 / 93 | 0 / 0 | 0 / 0 | 0 / 0 | 4 / 6 | 0 / 0 | 33 / 50 | 29 / 30 | 696 |
| 1000 | pool (live resize) | 158 / 160 | 141 / 143 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 33 / 33 | 42 / 43 | 822 |
| 1000 | glide (live resize) | 35 / 36 | 46 / 46 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 100000 | mui (shipped: freeze+remount) | 291 / 295 | 264 / 267 | 164 / 209 | 151 / 188 | 2 / 3 | 8 / 9 | 0 / 0 | 50 / 50 | 93 / 103 | 576 |
| 100000 | mui (live resize) | 298 / 301 | 270 / 274 | 51 / 58 | 0 / 0 | 0 / 1 | 7 / 7 | 0 / 0 | 33 / 50 | 79 / 98 | 576 |
| 100000 | tanstack (live resize) | 123 / 127 | 95 / 103 | 0 / 0 | 0 / 0 | 0 / 0 | 4 / 5 | 0 / 0 | 33 / 33 | 30 / 32 | 696 |
| 100000 | pool (live resize) | 152 / 152 | 136 / 136 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 50 / 50 | 41 / 43 | 822 |
| 100000 | glide (live resize) | 34 / 35 | 43 / 44 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 11 | 8 | 0 |
| 10000 | 114 | 66 | 3 |
| 100000 | 989 | 630 | 6 |
