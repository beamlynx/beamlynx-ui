CPU throttle 4x, viewport 2560x1440 @2x, 60 columns, 5 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10000 | mui (shipped: freeze+remount) | 346 / 347 | 318 / 319 | 235 / 261 | 174 / 191 | 3 / 3 | 20 / 21 | 0 / 0 | 67 / 67 | 130 / 146 | 1076 |
| 10000 | mui (live resize) | 346 / 353 | 318 / 327 | 150 / 176 | 53 / 65 | 4 / 5 | 19 / 19 | 0 / 0 | 67 / 67 | 125 / 146 | 1076 |
| 10000 | tanstack (live resize) | 266 / 266 | 234 / 234 | 156 / 203 | 0 / 0 | 3 / 3 | 91 / 91 | 0 / 0 | 150 / 150 | 156 / 160 | 2931 |
| 10000 | glide (live resize) | 36 / 38 | 107 / 109 | 673 / 690 | 160 / 215 | 11 / 12 | 93 / 93 | 0 / 0 | 83 / 83 | 42 / 43 | 631 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 29 | 22 | 0 |
| 10000 | 235 | 149 | 0 |
| 100000 | 2603 | 1450 | 11 |
