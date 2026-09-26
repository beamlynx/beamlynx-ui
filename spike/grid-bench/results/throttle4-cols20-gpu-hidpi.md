GPU rendering, CPU throttle 4x, viewport 2560x1440 @2x, 20 columns, 3 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1000 | mui (shipped: freeze+remount) | 379 / 381 | 351 / 352 | 210 / 248 | 153 / 179 | 2 / 2 | 20 / 20 | 0 / 0 | 83 / 83 | 129 / 129 | 1076 |
| 1000 | mui (live resize) | 376 / 390 | 348 / 359 | 108 / 140 | 59 / 139 | 2 / 4 | 19 / 20 | 0 / 0 | 67 / 83 | 118 / 132 | 1076 |
| 1000 | tanstack (live resize) | 146 / 152 | 114 / 119 | 0 / 0 | 0 / 0 | 0 / 0 | 5 / 6 | 0 / 0 | 67 / 67 | 50 / 70 | 1011 |
| 1000 | pool (live resize) | 198 / 198 | 181 / 181 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 50 / 50 | 64 / 65 | 1137 |
| 1000 | glide (live resize) | 35 / 36 | 59 / 60 | 11 / 25 | 0 / 0 | 0 / 1 | 0 / 1 | 0 / 0 | 17 / 83 | 5 / 5 | 631 |
| 100000 | mui (shipped: freeze+remount) | 345 / 347 | 316 / 319 | 251 / 317 | 186 / 252 | 2 / 2 | 19 / 19 | 0 / 0 | 67 / 67 | 168 / 170 | 1076 |
| 100000 | mui (live resize) | 345 / 350 | 317 / 320 | 99 / 143 | 61 / 115 | 2 / 3 | 19 / 19 | 0 / 0 | 67 / 67 | 156 / 165 | 1076 |
| 100000 | tanstack (live resize) | 147 / 150 | 118 / 130 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 67 / 67 | 51 / 52 | 1011 |
| 100000 | pool (live resize) | 187 / 188 | 170 / 171 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 67 / 67 | 67 / 70 | 1137 |
| 100000 | glide (live resize) | 35 / 36 | 58 / 59 | 15 / 26 | 0 / 0 | 1 / 1 | 1 / 1 | 0 / 0 | 100 / 100 | 3 / 4 | 631 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 18 | 7 | 0 |
| 10000 | 93 | 59 | 0 |
| 100000 | 987 | 593 | 6 |
