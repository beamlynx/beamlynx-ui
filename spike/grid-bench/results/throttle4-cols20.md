CPU throttle 4x, 20 columns, 5 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | mui (shipped: freeze+remount) | 304 / 352 | 276 / 323 | 112 / 160 | 51 / 139 | 2 / 2 | 8 / 8 | 0 / 0 | 50 / 50 | 41 / 69 | 576 |
| 100 | mui (live resize) | 297 / 326 | 271 / 299 | 60 / 92 | 0 / 56 | 0 / 1 | 7 / 13 | 0 / 0 | 50 / 67 | 38 / 54 | 576 |
| 100 | tanstack (live resize) | 115 / 122 | 87 / 95 | 0 / 3 | 0 / 0 | 0 / 0 | 2 / 2 | 0 / 0 | 33 / 50 | 35 / 36 | 696 |
| 100 | lynx (live resize) | 155 / 161 | 135 / 141 | 0 / 0 | 0 / 0 | 0 / 0 | 2 / 3 | 0 / 0 | 50 / 50 | 63 / 69 | 1074 |
| 100 | glide (live resize) | 35 / 43 | 47 / 60 | 29 / 84 | 0 / 0 | 0 / 1 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 100 | ag (live resize) | 331 / 334 | 307 / 311 | 135 / 175 | 0 / 0 | 4 / 4 | 3 / 5 | 0 / 0 | 50 / 50 | 70 / 75 | 711 |
| 1000 | mui (shipped: freeze+remount) | 293 / 312 | 267 / 285 | 113 / 147 | 54 / 131 | 2 / 3 | 7 / 8 | 0 / 0 | 33 / 50 | 36 / 45 | 576 |
| 1000 | mui (live resize) | 293 / 296 | 266 / 269 | 47 / 80 | 0 / 0 | 0 / 1 | 6 / 8 | 0 / 0 | 33 / 50 | 37 / 55 | 576 |
| 1000 | tanstack (live resize) | 113 / 119 | 81 / 87 | 0 / 0 | 0 / 0 | 0 / 0 | 4 / 4 | 0 / 0 | 33 / 33 | 29 / 31 | 696 |
| 1000 | lynx (live resize) | 154 / 157 | 133 / 136 | 0 / 1 | 0 / 0 | 0 / 0 | 4 / 4 | 0 / 0 | 50 / 67 | 58 / 64 | 1074 |
| 1000 | glide (live resize) | 34 / 35 | 42 / 43 | 17 / 39 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 1000 | ag (live resize) | 332 / 336 | 310 / 313 | 136 / 164 | 0 / 0 | 3 / 5 | 7 / 9 | 0 / 0 | 67 / 83 | 90 / 100 | 711 |
| 10000 | mui (shipped: freeze+remount) | 282 / 284 | 256 / 257 | 121 / 164 | 64 / 148 | 2 / 3 | 6 / 6 | 0 / 0 | 33 / 50 | 58 / 74 | 576 |
| 10000 | mui (live resize) | 283 / 290 | 256 / 264 | 53 / 75 | 0 / 0 | 0 / 1 | 8 / 9 | 0 / 0 | 50 / 50 | 49 / 64 | 576 |
| 10000 | tanstack (live resize) | 117 / 121 | 85 / 89 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 33 / 50 | 32 / 34 | 696 |
| 10000 | lynx (live resize) | 155 / 159 | 134 / 139 | 0 / 1 | 0 / 0 | 0 / 0 | 3 / 3 | 0 / 0 | 67 / 67 | 56 / 64 | 1074 |
| 10000 | glide (live resize) | 34 / 36 | 44 / 46 | 19 / 36 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 10000 | ag (live resize) | 345 / 347 | 321 / 323 | 130 / 171 | 0 / 0 | 3 / 5 | 9 / 9 | 0 / 0 | 67 / 83 | 201 / 217 | 711 |
| 100000 | mui (shipped: freeze+remount) | 293 / 309 | 267 / 283 | 168 / 183 | 155 / 167 | 2 / 3 | 7 / 12 | 0 / 0 | 50 / 50 | 89 / 95 | 576 |
| 100000 | mui (live resize) | 293 / 297 | 266 / 271 | 51 / 60 | 0 / 0 | 0 / 1 | 7 / 9 | 0 / 0 | 33 / 33 | 79 / 91 | 576 |
| 100000 | tanstack (live resize) | 120 / 123 | 102 / 105 | 0 / 1 | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 33 / 33 | 30 / 33 | 696 |
| 100000 | lynx (live resize) | 152 / 157 | 131 / 136 | 0 / 0 | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 50 / 67 | 55 / 58 | 1074 |
| 100000 | glide (live resize) | 33 / 35 | 41 / 42 | 20 / 35 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 17 / 17 | 0 / 0 | 276 |
| 100000 | ag (live resize) | 555 / 561 | 531 / 537 | 122 / 167 | 0 / 0 | 3 / 5 | 7 / 10 | 0 / 0 | 67 / 67 | 1369 / 1384 | 711 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 12 | 7 | 0 |
| 10000 | 106 | 61 | 0 |
| 100000 | 991 | 611 | 2 |
