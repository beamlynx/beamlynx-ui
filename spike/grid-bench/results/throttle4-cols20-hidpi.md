CPU throttle 4x, viewport 2560x1440 @2x, 20 columns, 5 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1000 | mui (shipped: freeze+remount) | 360 / 388 | 332 / 360 | 224 / 266 | 166 / 220 | 2 / 3 | 20 / 21 | 0 / 0 | 83 / 100 | 137 / 209 | 1076 |
| 1000 | mui (live resize) | 367 / 465 | 339 / 437 | 128 / 175 | 62 / 149 | 2 / 4 | 19 / 20 | 0 / 0 | 83 / 83 | 138 / 204 | 1076 |
| 1000 | tanstack (live resize) | 142 / 147 | 110 / 115 | 0 / 0 | 0 / 0 | 0 / 0 | 10 / 13 | 0 / 0 | 50 / 50 | 50 / 53 | 1011 |
| 1000 | glide (live resize) | 36 / 37 | 105 / 107 | 681 / 700 | 107 / 216 | 11 / 12 | 93 / 93 | 0 / 0 | 83 / 83 | 41 / 41 | 631 |
| 10000 | mui (shipped: freeze+remount) | 342 / 347 | 315 / 319 | 237 / 259 | 177 / 201 | 2 / 4 | 20 / 20 | 0 / 0 | 83 / 117 | 121 / 167 | 1076 |
| 10000 | mui (live resize) | 341 / 356 | 313 / 328 | 117 / 152 | 70 / 126 | 3 / 4 | 20 / 21 | 0 / 0 | 83 / 83 | 126 / 136 | 1076 |
| 10000 | tanstack (live resize) | 141 / 145 | 109 / 114 | 0 / 0 | 0 / 0 | 0 / 0 | 10 / 14 | 0 / 0 | 50 / 67 | 50 / 54 | 1011 |
| 10000 | glide (live resize) | 37 / 38 | 108 / 111 | 684 / 704 | 159 / 214 | 11 / 12 | 93 / 94 | 0 / 0 | 83 / 83 | 42 / 43 | 631 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 17 | 9 | 0 |
| 10000 | 106 | 63 | 0 |
| 100000 | 1035 | 616 | 5 |
