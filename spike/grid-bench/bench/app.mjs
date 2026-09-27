// Measures the real beamlynx-ui, not the bench page: the desktop static
// export, served locally, with every pine-lang API call answered by a mock
// in the browser (nothing reaches a real server or database).
//
//   (in beamlynx-ui)  NEXT_DESKTOP=1 NEXT_PUBLIC_DESKTOP=1 npx next build
//   node bench/app.mjs --out=/path/to/beamlynx-ui/out [--rows=1000] [--runs=3]
//                      [--gpu] [--dpr=1] [--shot=file.png] [--tag=name]
import { mkdir, writeFile } from 'node:fs/promises';
import { startApp } from './app-lib.mjs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const OUT = path.resolve(String(args.out));
const ROWS = Number(args.rows ?? 1000);
const COLS = Number(args.cols ?? 20);
const RUNS = Number(args.runs ?? 3);
const THROTTLE = Number(args.throttle ?? 4);
const DPR = Number(args.dpr ?? 1);
const VW = Number(args.width ?? 1600), VH = Number(args.height ?? 900);
const EXE = process.env.CHROME ?? path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

const { PORT, server, mockApi, SEED_STORAGE, PROBE, EXPRESSION } = await startApp({ out: OUT, rows: ROWS, cols: COLS });

const browser = await chromium.launch({
  executablePath: EXE,
  args: [
    ...(args.gpu ? ['--enable-gpu', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'] : []),
    '--enable-gpu-rasterization', '--disable-renderer-backgrounding', '--disable-background-timer-throttling',
  ],
});

const results = [];
for (let run = 0; run < RUNS; run++) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await mockApi(page);
  await page.addInitScript(SEED_STORAGE, EXPRESSION);
  await page.addInitScript(PROBE);
  await page.goto(`http://localhost:${PORT}/`);
  // The Pine panel's run button.
  const runButton = page.locator('button[title^="Run"]:visible').first();
  if (args.debug) { await page.waitForTimeout(4000); await page.screenshot({ path: String(args.debug) }); console.log(await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.getAttribute('aria-label') || b.title || b.innerText).slice(0, 30)).filter(Boolean).join(' | '))); }
  await runButton.waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  const r = { run };
  // 1. run the query: click to the grid's first painted frame.
  await page.evaluate(() => { window.__stop = window.__probe(true); window.__t0 = performance.now(); });
  await runButton.click();
  await page.waitForFunction(() => !!document.querySelector('[data-results-grid-ready], .MuiDataGrid-row'), null, { timeout: 30000 });
  r.runToGridMs = await page.evaluate(() => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - window.__t0))))));
  await page.waitForTimeout(1000);
  r.run_ = await page.evaluate(() => window.__stop());

  // 2. open and close Settings three times.
  const settings = page.locator('button[aria-label="Settings"]:visible').first();
  r.resize = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.__stop = window.__probe(true); });
    await settings.click();
    await page.waitForTimeout(900);
    await page.locator('button[aria-label="Close settings"]:visible').first().click();
    await page.waitForTimeout(900);
    r.resize.push(await page.evaluate(() => window.__stop()));
  }

  // 3. scroll the grid body.
  r.scroll = await page.evaluate(async () => {
    const el = document.querySelector('[data-results-scroller], .MuiDataGrid-virtualScroller, .dvn-scroller');
    if (!el) return { error: 'no scroller' };
    const nf = () => new Promise(res => requestAnimationFrame(() => res()));
    el.scrollTop = 0; await nf(); await nf();
    const stop = window.__probe(false);
    for (let i = 0; i < 90; i++) { el.scrollTop += 120; await nf(); }
    return stop();
  });

  // 4. re-run: a new result of the same size.
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__stop = window.__probe(true); });
  await runButton.click();
  await page.waitForTimeout(1500);
  r.rerun = await page.evaluate(() => window.__stop());

  if (args.shot && run === 0) await page.screenshot({ path: String(args.shot) });
  if (errors.length) r.errors = errors;
  results.push(r);
  console.log(`run ${run} done${errors.length ? ' (page errors: ' + errors.length + ')' : ''}`);
  await page.close();
}
await browser.close();
server.close();

const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const mx = xs => Math.max(...xs);
const f = xs => `${med(xs)} / ${mx(xs)}`;
const rz = results.flatMap(r => r.resize);
const summary = [
  `beamlynx-ui in-app, ${args.gpu ? 'GPU' : 'software'} rendering, ${THROTTLE}x CPU throttle, ${VW}x${VH} @${DPR}x, ${ROWS} rows x ${COLS} cols, ${RUNS} runs (median / worst)`,
  '',
  '| run → grid painted ms | run blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll max frame ms | re-run blocked ms |',
  '|---|---|---|---|---|---|---|---|',
  `| ${f(results.map(r => r.runToGridMs))} | ${f(results.map(r => r.run_.blockedMs))} | ${f(rz.map(x => x.blockedMs))} | ${f(rz.map(x => x.longTaskMs))} | ${f(rz.map(x => x.slowFrames))} | ${f(results.map(r => r.scroll.slowFrames ?? -1))} | ${f(results.map(r => r.scroll.maxFrameMs ?? -1))} | ${f(results.map(r => r.rerun.blockedMs))} |`,
];
const errs = results.flatMap(r => r.errors ?? []);
if (errs.length) summary.push('', 'Page errors:', ...[...new Set(errs)].map(e => '- ' + e.slice(0, 300)));
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'results');
await mkdir(dir, { recursive: true });
if (args.tag) await writeFile(path.join(dir, `app-${args.tag}.md`), summary.join('\n') + '\n');
console.log('\n' + summary.join('\n'));
