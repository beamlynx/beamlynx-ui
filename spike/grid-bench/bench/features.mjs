// Exercises the features that are hardest to carry over, against each
// candidate: inline edit, the JSON cell click, the context menu's cell
// hit-test, and a column resize surviving the grid unmounting and remounting.
//
//   npm run build && node bench/features.mjs
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 4175;
const EXE = process.env.CHROME ?? path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-features', '--port', String(PORT), '--strictPort'], {
  cwd: path.dirname(new URL(import.meta.url).pathname) + '/..', stdio: 'ignore',
});
await new Promise(r => setTimeout(r, 2500));
const browser = await chromium.launch({ executablePath: EXE });

// Geometry shared by every candidate: 8px pane padding, 1px border (not
// for glide), 40px header, 36px rows.
const libs = process.argv[2] ? process.argv[2].split(',') : ['mui', 'tanstack', 'lynx', 'pool', 'glide', 'ag'];
const report = {};
for (const lib of libs) {
  const page = await browser.newPage({ viewport: { width: 2600, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/?lib=${lib}&rows=1000&cols=20&freeze=1`);
  await page.waitForFunction(() => !!window.bench);
  await page.evaluate(() => window.bench.mount());
  const r = {};
  const widths = await page.evaluate(() => window.bench.widths());
  const left = 9, top = 9;
  const colX = i => left + widths.slice(0, i).reduce((a, b) => a + b, 0) + widths[i] / 2;
  const rowY = i => top + 40 + i * 36 + 18;
  const lastLog = () => page.evaluate(() => window.bench.menuLog().at(-1) ?? null);

  // 1. inline edit: double-click column 2, row 3, replace, Enter.
  await page.mouse.dblclick(colX(2), rowY(3));
  await page.waitForTimeout(600);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('edited value');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  r.edit = await lastLog();

  // 1b. the editor's Inspect button (glide only: the custom editor under test).
  if (lib === 'glide') {
    await page.mouse.dblclick(colX(4), rowY(2));
    await page.waitForTimeout(600);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('inspect me');
    await page.waitForTimeout(200);
    await page.click('[data-inspect]');
    await page.waitForTimeout(300);
    r.inspect = await lastLog();
  }

  // 2. JSON column (field 9) opens the inspector on a single click.
  await page.mouse.click(colX(9), rowY(4));
  await page.waitForTimeout(200);
  r.json = await lastLog();

  // 3. right-click hit-test.
  await page.mouse.click(colX(5), rowY(6), { button: 'right' });
  await page.waitForTimeout(200);
  r.contextMenu = await lastLog();

  // 4. drag column 1's right edge +120px, then force a remount via the
  // shipped freeze path and read the width back.
  const edge = left + widths[0] + widths[1] - 2;
  await page.mouse.move(edge, top + 20);
  await page.mouse.down();
  await page.mouse.move(edge + 60, top + 20, { steps: 5 });
  await page.mouse.move(edge + 120, top + 20, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterDrag = (await page.evaluate(() => window.bench.widths()))[1];
  await page.evaluate(() => window.bench.resizeCycle());
  const afterRemount = (await page.evaluate(() => window.bench.widths()))[1];
  r.columnResize = `${widths[1]} -> ${afterDrag} (after remount ${afterRemount})`;

  // 5. what a screen reader gets.
  r.a11y = await page.evaluate(() => {
    const grid = document.querySelector('[role=grid], [role=treegrid], table');
    return grid ? `${grid.getAttribute('role') ?? grid.tagName} with ${grid.querySelectorAll('[role=gridcell], td').length} cells` : 'none';
  });
  if (errors.length) r.errors = errors;
  report[lib] = r;
  await page.close();
}
await browser.close();
server.kill();
console.log(JSON.stringify(report, null, 2));
