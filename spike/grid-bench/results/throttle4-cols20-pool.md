CPU throttle 4x, 20 columns, 5 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1000 | mui (shipped: freeze+remount) | 295 / 300 | 269 / 274 | 110 / 148 | 53 / 131 | 2 / 3 | 7 / 8 | 0 / 0 | 50 / 50 | 42 / 58 | 576 |
| 1000 | mui (live resize) | 293 / 296 | 267 / 270 | 50 / 73 | 0 / 0 | 0 / 2 | 7 / 9 | 0 / 0 | 33 / 50 | 42 / 71 | 576 |
| 1000 | tanstack (live resize) | 113 / 116 | 80 / 83 | 0 / 0 | 0 / 0 | 0 / 0 | 5 / 6 | 0 / 0 | 33 / 33 | 29 / 32 | 696 |
| 1000 | pool (live resize) | 149 / 152 | 132 / 135 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 33 / 33 | 41 / 45 | 822 |
| 1000 | glide (live resize) | 36 / 38 | 45 / 46 | 19 / 40 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 100000 | mui (shipped: freeze+remount) | 296 / 299 | 269 / 272 | 163 / 178 | 151 / 164 | 2 / 3 | 7 / 8 | 0 / 0 | 50 / 50 | 85 / 101 | 576 |
| 100000 | mui (live resize) | 296 / 302 | 270 / 276 | 46 / 55 | 0 / 0 | 0 / 1 | 6 / 8 | 0 / 0 | 33 / 50 | 86 / 100 | 576 |
| 100000 | tanstack (live resize) | 121 / 126 | 90 / 106 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 8 | 0 / 0 | 33 / 33 | 31 / 31 | 696 |
| 100000 | pool (live resize) | 150 / 152 | 133 / 135 | 0 / 1 | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 50 / 50 | 43 / 45 | 822 |
| 100000 | glide (live resize) | 34 / 36 | 43 / 51 | 15 / 47 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 14 | 8 | 0 |
| 10000 | 97 | 65 | 0 |
| 100000 | 1054 | 580 | 5 |
