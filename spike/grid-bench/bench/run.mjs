// Drives the production build of the bench page through a matrix of
// grid libraries x row counts, N fresh page loads each, under CPU
// throttling, and writes raw and summarized results.
//
//   npm run build && node bench/run.mjs [--quick] [--runs=5] [--throttle=4]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const QUICK = !!args.quick;
const RUNS = Number(args.runs ?? (QUICK ? 1 : 5));
const THROTTLE = Number(args.throttle ?? 4);
const PORT = 4173;
const EXE =
  process.env.CHROME ??
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

const ALL_CONFIGS = [
  { name: 'mui (shipped: freeze+remount)', lib: 'mui', freeze: 1 },
  { name: 'mui (live resize)', lib: 'mui', freeze: 0 },
  { name: 'tanstack (live resize)', lib: 'tanstack', freeze: 0 },
  { name: 'lynx (live resize)', lib: 'lynx', freeze: 0 },
  { name: 'pool (live resize)', lib: 'pool', freeze: 0 },
  { name: 'glide (live resize)', lib: 'glide', freeze: 0 },
  { name: 'ag (live resize)', lib: 'ag', freeze: 0 },
];
const CONFIGS = args.libs ? ALL_CONFIGS.filter(c => String(args.libs).split(',').includes(c.lib)) : ALL_CONFIGS;
const ROW_COUNTS = QUICK ? [1000] : (args.rows ? String(args.rows).split(',').map(Number) : [100, 1000, 10000, 100000]);
const COLS = Number(args.cols ?? 20);
const RESIZE_CYCLES = 3;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: path.dirname(new URL(import.meta.url).pathname) + '/..',
  stdio: 'ignore',
});
await new Promise(r => setTimeout(r, 2500));

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: ['--enable-gpu-rasterization', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
});

const raw = [];
try {
  for (const rows of ROW_COUNTS) {
    for (const cfg of CONFIGS) {
      for (let run = 0; run < RUNS; run++) {
        const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
        const cdp = await page.context().newCDPSession(page);
        const url = `http://localhost:${PORT}/?lib=${cfg.lib}&rows=${rows}&cols=${COLS}&freeze=${cfg.freeze}`;
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(url);
        await page.waitForFunction(() => !!window.bench);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
        const result = { config: cfg.name, lib: cfg.lib, rows, cols: COLS, run };
        try {
          result.mount = await page.evaluate(() => window.bench.mount());
          result.domNodes = await page.evaluate(() => window.bench.domNodes());
          result.resize = [];
          for (let i = 0; i < RESIZE_CYCLES; i++) result.resize.push(await page.evaluate(() => window.bench.resizeCycle()));
          result.scroll = await page.evaluate(() => window.bench.scroll(120, 90));
          result.swap = await page.evaluate(() => window.bench.swap(2));
          if (run === 0 && cfg.freeze === 0 && rows === ROW_COUNTS[0]) {
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
            result.dataPath = await page.evaluate(() => [1000, 10000, 100000].map(n => window.bench.dataPath(n)));
          }
        } catch (e) {
          result.error = String(e);
        }
        if (errors.length) result.pageErrors = errors;
        raw.push(result);
        process.stdout.write(`${cfg.name} rows=${rows} run=${run} ${result.error ? 'ERROR ' + result.error : 'ok'}\n`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}

// ---- summarize: median and worst across runs ----
const med = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const max = xs => Math.max(...xs);
const groups = new Map();
for (const r of raw.filter(r => !r.error)) {
  const k = `${r.rows}|${r.config}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
const lines = [
  `CPU throttle ${THROTTLE}x, ${COLS} columns, ${RUNS} runs each. Values are median / worst across runs.`,
  `Resize = one panel open+close cycle (${RESIZE_CYCLES} cycles per run, each cycle counted).`,
  '',
  '| rows | config | mount paint ms | mount blocked ms | resize blocked ms | resize long tasks ms | resize slow frames | scroll slow frames | scroll blank frames | scroll max frame ms | swap blocked ms | DOM nodes |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|',
];
for (const [k, rs] of groups) {
  const [rows, config] = k.split('|');
  const rz = rs.flatMap(r => r.resize);
  const f = (xs) => `${med(xs)} / ${max(xs)}`;
  lines.push(
    `| ${rows} | ${config} | ${f(rs.map(r => r.mount.paintMs))} | ${f(rs.map(r => r.mount.blockedMs))} | ${f(rz.map(x => x.blockedMs))} | ${f(rz.map(x => x.longTaskMs))} | ${f(rz.map(x => x.slowFrames))} | ${f(rs.map(r => r.scroll.slowFrames))} | ${f(rs.map(r => r.scroll.blankFrames))} | ${f(rs.map(r => r.scroll.maxFrameMs))} | ${f(rs.map(r => r.swap.blockedMs))} | ${med(rs.map(r => r.domNodes))} |`,
  );
}
const dp = raw.find(r => r.dataPath)?.dataPath;
if (dp) {
  lines.push('', 'Data path (unthrottled): MobX deep observable assign + toJS vs observable.ref assign, ms', '', '| rows | deep assign | toJS | ref assign |', '|---|---|---|---|');
  for (const d of dp) lines.push(`| ${d.n} | ${d.deepAssign} | ${d.deepToJS} | ${d.refAssign} |`);
}
const errs = raw.filter(r => r.error || r.pageErrors);
if (errs.length) lines.push('', 'Errors:', ...errs.map(r => `- ${r.config} rows=${r.rows}: ${r.error ?? ''} ${(r.pageErrors ?? []).join('; ')}`));

const outDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'results');
mkdirSync(outDir, { recursive: true });
const stamp = (QUICK ? 'quick' : `throttle${THROTTLE}-cols${COLS}`) + (args.tag ? `-${args.tag}` : '');
writeFileSync(path.join(outDir, `${stamp}.raw.json`), JSON.stringify(raw, null, 1));
writeFileSync(path.join(outDir, `${stamp}.md`), lines.join('\n') + '\n');
console.log('\n' + lines.join('\n'));
