// Two independent measures of main-thread health during a scenario:
// - a setTimeout probe (the metric the original plan's table used): how late
//   each back-to-back timer fires; lateness beyond one frame is "blocked".
// - rAF deltas: how long each frame actually took to arrive.
// Long tasks (>50ms) are recorded passively alongside both.

export interface ProbeResult {
  blockedMs: number;
  maxGapMs: number;
  longTaskMs: number;
  longTasks: number;
  frames: number;
  slowFrames: number; // > 33ms, i.e. at least one frame dropped at 60Hz
  maxFrameMs: number;
}

export function startProbe(opts: { timers: boolean }) {
  let running = true;
  let blocked = 0, maxGap = 0, last = performance.now();
  const tick = () => {
    if (!running) return;
    const now = performance.now();
    const gap = now - last;
    last = now;
    if (gap > 16) blocked += gap - 16;
    if (gap > maxGap) maxGap = gap;
    setTimeout(tick, 0);
  };
  if (opts.timers) setTimeout(tick, 0);

  let frames = 0, slow = 0, maxFrame = 0, lastFrame = performance.now();
  const frame = (t: number) => {
    if (!running) return;
    const d = t - lastFrame;
    lastFrame = t;
    frames++;
    if (d > 33) slow++;
    if (d > maxFrame) maxFrame = d;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(frame); });

  let ltMs = 0, lt = 0;
  const obs = new PerformanceObserver(list => {
    for (const e of list.getEntries()) { ltMs += e.duration; lt++; }
  });
  obs.observe({ type: 'longtask', buffered: false });

  return (): ProbeResult => {
    running = false;
    obs.disconnect();
    return {
      blockedMs: Math.round(blocked),
      maxGapMs: Math.round(maxGap),
      longTaskMs: Math.round(ltMs),
      longTasks: lt,
      frames,
      slowFrames: slow,
      maxFrameMs: Math.round(maxFrame),
    };
  };
}

export const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
