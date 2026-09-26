GPU rendering, CPU throttle 4x, viewport 2560x1440 @2x, 60 columns, 3 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10000 | mui (shipped: freeze+remount) | 355 / 356 | 326 / 327 | 234 / 243 | 176 / 185 | 2 / 3 | 20 / 20 | 0 / 0 | 67 / 67 | 151 / 153 | 1076 |
| 10000 | mui (live resize) | 354 / 356 | 325 / 328 | 143 / 201 | 54 / 58 | 2 / 6 | 19 / 19 | 0 / 0 | 67 / 100 | 128 / 129 | 1076 |
| 10000 | tanstack (live resize) | 272 / 290 | 240 / 274 | 142 / 172 | 0 / 0 | 2 / 2 | 91 / 91 | 0 / 0 | 167 / 167 | 156 / 157 | 2931 |
| 10000 | pool (live resize) | 428 / 455 | 411 / 438 | 172 / 198 | 0 / 0 | 4 / 5 | 88 / 88 | 0 / 0 | 150 / 167 | 199 / 206 | 3297 |
| 10000 | glide (live resize) | 34 / 37 | 60 / 66 | 17 / 26 | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 0 | 83 / 83 | 4 / 5 | 631 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 31 | 18 | 5 |
| 10000 | 232 | 149 | 0 |
| 100000 | 2567 | 1465 | 11 |
