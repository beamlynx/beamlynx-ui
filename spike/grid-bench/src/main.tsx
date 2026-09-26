// Bench shell. Mirrors the one layout fact that matters: the results pane
// is a flex sibling of a panel that animates its width, so opening the panel
// resizes the grid rather than covering it (see beamlynx-ui's
// NewLayoutView.tsx and styles/freeze-during-motion.ts).
//
// URL params: lib=mui|tanstack|lynx|pool|glide|ag, rows=N, cols=N, colors=0|1,
// freeze=0|1 (1 = the shipped "pin the pane, unmount the grid, remount
// after" behavior; 0 = the grid resizes live on every frame).
import { makeAutoObservable, observable, runInAction, toJS } from 'mobx';
import React, { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { estimateWidth, makeColumns, makeRows, type BenchRow } from './data';
import { nextFrame, sleep, startProbe } from './probe';
import AgGrid from './grids/AgGrid';
import GlideGrid from './grids/GlideGrid';
import MuiGrid from './grids/MuiGrid';
import TanstackGrid from './grids/TanstackGrid';
import LynxGrid from './grids/LynxGrid';
import PoolGrid from './grids/PoolGrid';
import { ROW_SELECTOR, SCROLLER_SELECTOR, type GridProps } from './grids/types';

const params = new URLSearchParams(location.search);
const LIB = params.get('lib') ?? 'tanstack';
const ROWS = Number(params.get('rows') ?? 500);
const COLS = Number(params.get('cols') ?? 20);
const COLORS = params.get('colors') !== '0';
const FREEZE = params.get('freeze') === '1';

const GRIDS: Record<string, React.ComponentType<GridProps>> = {
  mui: MuiGrid,
  tanstack: TanstackGrid,
  glide: GlideGrid,
  ag: AgGrid,
  lynx: LynxGrid,
  pool: PoolGrid,
};

// Tokyo-night-ish, the dark theme from beamlynx-ui's styles/palette/themes.ts.
const THEME: Record<string, string> = {
  '--canvas-bg': '#1a1b26',
  '--canvas-node-bg': '#1f2335',
  '--canvas-node-border': '#363b58',
  '--canvas-trace': '#7aa2f7',
  '--canvas-pin': '#565f89',
  '--canvas-text': '#c0caf5',
  '--canvas-text-dim': '#787c99',
  '--canvas-chip-bg': '#24283b',
  '--canvas-picker-bg': '#1f2335',
  '--code-font': "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
  '--canvas-font': 'system-ui, sans-serif',
};
for (const [k, v] of Object.entries(THEME)) document.documentElement.style.setProperty(k, v);
document.body.style.cssText = 'margin:0;background:var(--canvas-bg);color:var(--canvas-text)';

const TABLE_TINTS = ['rgba(122,162,247,0.28)', 'rgba(187,154,247,0.28)', 'rgba(158,206,106,0.28)', 'rgba(224,175,104,0.28)'];

const columns = makeColumns(COLS);

let setShown: (v: boolean) => void = () => {};
let setSettling: (v: boolean) => void = () => {};
let setPanelOpen: (v: boolean) => void = () => {};
let setDataset: (rows: BenchRow[]) => void = () => {};
let menuLog: string[] = [];
let currentWidths: Record<string, number> = {};

function App() {
  const [shown, _setShown] = useState(false);
  const [settling, _setSettling] = useState(false);
  const [panelOpen, _setPanelOpen] = useState(false);
  const [rows, _setRows] = useState<BenchRow[]>(() => makeRows(columns, ROWS, 1));
  const [resized, setResized] = useState<Record<string, number>>({});
  setShown = _setShown;
  setSettling = _setSettling;
  setPanelOpen = _setPanelOpen;
  setDataset = _setRows;

  const jsonFields = useMemo(() => new Set(columns.filter(c => c.kind === 'json').map(c => c.field)), []);
  const widths = useMemo(() => {
    const w: Record<string, number> = {};
    for (const c of columns) w[c.field] = resized[c.field] ?? estimateWidth(rows, c);
    return w;
  }, [rows, resized]);
  currentWidths = widths;
  const headerColors = useMemo(() => {
    if (!COLORS) return {};
    const aliases = Array.from(new Set(columns.map(c => c.alias)));
    return Object.fromEntries(aliases.map((a, i) => [a, TABLE_TINTS[i % TABLE_TINTS.length]]));
  }, []);

  const onWidthChange = useCallback((field: string, width: number) => {
    setResized(prev => ({ ...prev, [field]: width }));
  }, []);
  const log = useCallback((s: string) => menuLog.push(s), []);

  const Grid = GRIDS[LIB];
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div data-results-pane style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', padding: 8 }}>
        <div style={{ position: 'absolute', inset: 8 }}>
          {shown && !settling && (
            <Grid
              columns={columns}
              rows={rows}
              widths={widths}
              onWidthChange={onWidthChange}
              headerColors={headerColors}
              jsonFields={jsonFields}
              onJsonOpen={(r, f) => log(`json ${r} ${f}`)}
              onCommitEdit={(r, f, v) => log(`edit ${r} ${f} ${v}`)}
              onCellContextMenu={(r, f) => log(`menu ${r} ${f}`)}
              onInspect={(r, f, v) => log(`inspect ${r} ${f} ${v}`)}
            />
          )}
        </div>
      </div>
      <div
        style={{
          width: panelOpen ? 640 : 0,
          flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--canvas-node-bg)',
          borderLeft: '1px solid var(--canvas-node-border)',
          transition: `width ${panelOpen ? 200 : 150}ms cubic-bezier(0.2, 0, 0, 1)`,
        }}
      />
    </div>
  );
}

// ---- freeze-during-motion.ts, reduced to what the bench needs ----
function freezeDuringMotion(durationMs: number) {
  const pane = document.querySelector<HTMLElement>('[data-results-pane]')!;
  const width = pane.getBoundingClientRect().width;
  const prev = pane.style.flex;
  setSettling(true);
  pane.style.flex = `0 0 ${Math.round(width)}px`;
  setTimeout(() => {
    pane.style.flex = prev;
    setTimeout(() => setSettling(false), 450);
  }, durationMs + 48);
}

// ---- the API Playwright drives ----
async function settle(ms = 300) {
  await nextFrame();
  await nextFrame();
  await sleep(ms);
}

declare global {
  interface Window { bench: any }
}

let panelIsOpen = false;
window.bench = {
  lib: LIB,
  async mount() {
    const stop = startProbe({ timers: true });
    const t0 = performance.now();
    flushSync(() => setShown(true));
    const commitMs = performance.now() - t0;
    await nextFrame();
    await nextFrame();
    const paintMs = performance.now() - t0;
    await sleep(1000);
    return { commitMs: Math.round(commitMs), paintMs: Math.round(paintMs), ...stop() };
  },
  async swap(seed: number) {
    const next = makeRows(columns, ROWS, seed);
    await settle(200);
    const stop = startProbe({ timers: true });
    const t0 = performance.now();
    flushSync(() => setDataset(next));
    await nextFrame();
    await nextFrame();
    const paintMs = performance.now() - t0;
    await sleep(800);
    return { paintMs: Math.round(paintMs), ...stop() };
  },
  /** One open + close of the side panel, measured end to end. */
  async resizeCycle() {
    await settle(200);
    const stop = startProbe({ timers: true });
    for (const open of [true, false]) {
      panelIsOpen = open;
      if (FREEZE) freezeDuringMotion(open ? 200 : 150);
      setPanelOpen(open);
      await sleep(open ? 900 : 900);
    }
    return stop();
  },
  /** Scroll the body at a steady speed, then jump to the bottom and back. */
  async scroll(pxPerFrame: number, frames: number) {
    const el = document.querySelector<HTMLElement>(SCROLLER_SELECTOR[LIB]);
    if (!el) throw new Error('no scroller for ' + LIB);
    el.scrollTop = 0;
    await settle(300);
    const stop = startProbe({ timers: false });
    // A frame is "blank" if, when it starts, the point a third of the way
    // down the body has no row under it - the previous frame was painted
    // with a hole where rows should have been.
    const rowSel = ROW_SELECTOR[LIB];
    const box = el.getBoundingClientRect();
    let blankFrames = 0;
    for (let i = 0; i < frames; i++) {
      el.scrollTop += pxPerFrame;
      await nextFrame();
      if (rowSel) {
        const hitEl = document.elementFromPoint(box.left + 60, box.top + box.height / 3);
        if (!hitEl?.closest(rowSel)) blankFrames++;
      }
    }
    el.scrollTop = el.scrollHeight;
    await nextFrame(); await nextFrame();
    el.scrollTop = Math.floor(el.scrollHeight / 2);
    await nextFrame(); await nextFrame();
    el.scrollTop = 0;
    await sleep(300);
    const r = stop();
    return { ...r, blankFrames, scrollHeight: el.scrollHeight };
  },
  domNodes() {
    return document.querySelector('[data-results-pane]')!.getElementsByTagName('*').length;
  },
  menuLog() { return menuLog; },
  widths() { return columns.map(c => currentWidths[c.field]); },
  /** Time to hand a server response to MobX the way default.plugin.tsx does, then toJS it the way Result.tsx does. */
  dataPath(n: number) {
    const raw = makeRows(columns, n, 7);
    class Deep { rows: BenchRow[] = []; constructor() { makeAutoObservable(this); } }
    class Ref { rows: BenchRow[] = []; constructor() { makeAutoObservable(this, { rows: observable.ref }); } }
    const deep = new Deep();
    const ref = new Ref();
    let t = performance.now();
    runInAction(() => { deep.rows = raw.map((r, i) => ({ ...r, _id: i })); });
    const deepAssign = performance.now() - t;
    t = performance.now();
    toJS(deep.rows);
    const deepToJS = performance.now() - t;
    t = performance.now();
    runInAction(() => { ref.rows = raw.map((r, i) => ({ ...r, _id: i })); });
    const refAssign = performance.now() - t;
    return { n, deepAssign: Math.round(deepAssign), deepToJS: Math.round(deepToJS), refAssign: Math.round(refAssign) };
  },
};

createRoot(document.getElementById('root')!).render(<App />);
