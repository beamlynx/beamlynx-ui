Software (SwiftShader) rendering, CPU throttle 4x, viewport 2560x1440 @2x, 20 columns, 3 runs each. Values are median / worst across runs.
Resize = one panel open+close cycle (3 cycles per run, each cycle counted).

| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 10000 | glide (live resize) | 37 / 38 | 110 / 110 | 676 / 690 | 160 / 216 | 11 / 11 | 93 / 93 | 0 / 0 | 83 / 83 | 41 / 41 | 631 |

Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms

| rows | deep assign | toJS | ref assign |
|---|---|---|---|
| 1000 | 12 | 8 | 0 |
| 10000 | 104 | 62 | 0 |
| 100000 | 1109 | 587 | 2 |
