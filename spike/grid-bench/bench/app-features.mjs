// Drives the real app's results grid through its features, against the
// mocked API (see app-lib.mjs). Prints one line per check.
//
//   node bench/app-features.mjs --out=/path/to/beamlynx-ui/out [--gpu]
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startApp } from './app-lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const COLS = 20;
const HIDDEN = !!args['hidden-ids'];
const app = await startApp({ out: path.resolve(String(args.out)), rows: 1000, cols: COLS, hiddenIds: HIDDEN });
const EXE = process.env.CHROME ?? path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const browser = await chromium.launch({
  executablePath: EXE,
  args: args.gpu ? ['--enable-gpu', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist'] : [],
});
const context = await browser.newContext({ viewport: { width: 3000, height: 1000 } });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://localhost:${app.PORT}` });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await app.mockApi(page);
await page.addInitScript(app.SEED_STORAGE, app.EXPRESSION);
await page.goto(`http://localhost:${app.PORT}/`);
const run = page.locator('button[title^="Run"]:visible').first();
await run.waitFor();
await page.waitForTimeout(1200);
await run.click();
await page.locator('[data-results-grid-ready]').waitFor();
await page.waitForTimeout(800);

// Column widths, computed the way Result.tsx does from the same mock data.
const evalBody = app.lastEval();
const header = evalBody.result[0];
const data = evalBody.result.slice(1, 51);
const app_rows = evalBody.result.slice(1);
const widths = header.map((h, c) => {
  if (c % 10 === 9) return 250; // JSON column: (min + max) / 2
  let longest = h.length;
  for (const row of data) if (row[c] !== null && row[c] !== undefined) longest = Math.max(longest, String(row[c]).length);
  return Math.min(Math.max(longest * 8 + 32, 100), 400);
});
const hidden = evalBody.columns.map(c => c.hidden);
const visibleFields = header.map((_, i) => i).filter(i => !hidden[i]);
const box = await page.locator('[data-results-grid]').boundingBox();
// x of a field's column centre: hidden columns take no space.
const colX = (c, w = widths) => {
  let x = box.x + 1;
  for (let i = 0; i < c; i++) if (!hidden[i]) x += w[i];
  return x + w[c] / 2;
};
const rowY = r => box.y + 1 + 40 + r * 36 + 18;
const report = [];
const check = (name, ok, detail = '') => report.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
const lastEvalExpression = () => {
  const evals = app.requests.filter(r => r.path === 'eval');
  return JSON.stringify(evals.at(-1)?.body ?? {});
};

// 1. Inline edit, committed with Enter, runs an update!.
await page.mouse.dblclick(colX(2), rowY(3));
await page.waitForTimeout(500);
await page.keyboard.press('Control+A');
await page.keyboard.type('edited value');
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
{
  const sent = app.requests.filter(r => r.path === 'eval').map(r => JSON.stringify(r.body));
  const upd = sent.find(s => s.includes('update!') && s.includes('edited value'));
  // Row 3's a_0 id (field 0, hidden or not) and field 2's column name.
  const idOk = !!upd && upd.includes(`where: id = ${app_rows[3][0]}`) && upd.includes(`update! ${evalBody.columns[2].column} =`);
  check('edit commits an update! on the right row and column', idOk, upd ? upd.slice(0, 160) : `last eval: ${lastEvalExpression().slice(0, 140)}`);
}

// 2. The editor's Inspect button opens the update dialog instead.
await page.mouse.dblclick(colX(4), rowY(2));
await page.waitForTimeout(500);
await page.keyboard.press('Control+A');
await page.keyboard.type('inspect me');
if (args.debug) await page.screenshot({ path: args.debug + '-inspect-before.png' });
await page.locator('[aria-label="Inspect update"]').click();
await page.waitForTimeout(1200);
if (args.debug) await page.screenshot({ path: args.debug + '-inspect-after.png' });
{
  const heading = await page.getByText(/^Update a_0\./).first().isVisible().catch(() => false);
  const body = await page.getByText("update! email = 'inspect me'").first().isVisible().catch(() => false);
  check('Inspect opens the update dialog', heading && body);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}

// 3. A JSON cell opens the JSON panel.
await page.mouse.click(colX(9), rowY(4));
await page.waitForTimeout(800);
if (args.debug) await page.screenshot({ path: args.debug + '-json.png' });
{
  const visible = await page.getByText('u_0.metadata').first().isVisible().catch(() => false);
  check('JSON cell opens the JSON panel', visible);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
}

// 4. Right-click, Copy puts that cell's value on the clipboard.
await page.mouse.click(colX(5), rowY(6), { button: 'right' });
await page.waitForTimeout(400);
{
  const menu = page.getByRole('menuitem', { name: 'Copy' });
  const open = await menu.isVisible().catch(() => false);
  if (open) await menu.click();
  await page.waitForTimeout(300);
  const clip = open ? await page.evaluate(() => navigator.clipboard.readText()) : '';
  const expected = String(evalBody.result[1 + 6][5]);
  if (HIDDEN) {
    await page.keyboard.press('Escape');
    await page.mouse.click(colX(11), rowY(6), { button: 'right' });
    await page.waitForTimeout(400);
    const m2 = page.getByRole('menuitem', { name: 'Copy' });
    if (await m2.isVisible().catch(() => false)) await m2.click();
    await page.waitForTimeout(300);
    const c2 = await page.evaluate(() => navigator.clipboard.readText());
    check('context menu right of a hidden column copies that cell', c2 === String(app_rows[6][11]), `got ${JSON.stringify(c2)}`);
  }
  check('context menu copies the clicked cell', clip === expected, `got ${JSON.stringify(clip)}, expected ${JSON.stringify(expected)}`);
}

// 5. A dragged column width survives the grid remounting (the Settings
//    panel's resize unmounts it while the freeze is in place).
{
  const edge = colX(1) + widths[1] / 2 - 1;
  await page.mouse.move(edge, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(edge + 60, box.y + 20, { steps: 6 });
  await page.mouse.move(edge + 120, box.y + 20, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const settings = page.locator('button[aria-label="Settings"]:visible').first();
  await settings.click();
  await page.waitForTimeout(900);
  await page.locator('button[aria-label="Close settings"]:visible').first().click();
  await page.waitForTimeout(1200);
  const b2 = await page.locator('[data-results-grid]').boundingBox();
  const w2 = [...widths]; w2[1] += 120;
  // Column 2 ("title") now starts 120px further right: an edit there must name it.
  await page.mouse.dblclick(colX(2, w2) + (b2.x - box.x), rowY(1));
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('after resize');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const upd = app.requests.filter(r => r.path === 'eval').map(r => JSON.stringify(r.body)).find(s => s.includes('after resize'));
  check('column width survives a remount', !!upd && /update! title/.test(upd), upd ? upd.slice(0, 140) : 'no update sent');
}

// 6. Switching theme redraws the grid without a reload.
{
  const sample = async () => {
    const b = await page.locator('[data-results-grid]').boundingBox();
    const png = await page.screenshot({ clip: { x: b.x + 30, y: b.y + 1 + 40 + 36 * 5 + 30, width: 4, height: 4 } });
    return png.toString('base64');
  };
  const before = await sample();
  await page.locator('button[aria-label="Settings"]:visible').first().click();
  await page.waitForTimeout(700);
  await page.getByText('Appearance', { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Light/ }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('button[aria-label="Close settings"]:visible').first().click();
  await page.waitForTimeout(1200);
  const after = await sample();
  check('theme change redraws the grid', before !== after);
  if (args.shot) await page.screenshot({ path: String(args.shot) });
}

// 7. Hovering a table on the canvas tints its columns' headers.
{
  const b = await page.locator('[data-results-grid]').boundingBox();
  const headerSample = async () => (await page.screenshot({ clip: { x: b.x + 1 + widths.slice(0, 5).reduce((a, c) => a + c, 0) + 6, y: b.y + 8, width: 4, height: 4 } })).toString('base64');
  const before = await headerSample();
  await page.getByText('user', { exact: true }).first().hover();
  await page.waitForTimeout(500);
  const during = await headerSample();
  await page.mouse.move(5, 500);
  check('canvas hover tints that table\'s headers', before !== during);
}

// 8. A range, selected with Shift+click, copies as tab-separated text.
{
  const [f0, , f2] = visibleFields;
  await page.mouse.click(colX(f0), rowY(1));
  await page.waitForTimeout(300);
  // mouse.click has no modifiers option (only locator.click does); hold it.
  await page.keyboard.down('Shift');
  await page.mouse.click(colX(f2), rowY(2));
  await page.keyboard.up('Shift');
  await page.waitForTimeout(300);
  if (args.debug) {
    await page.evaluate(() => { window.__copyEvents = 0; document.addEventListener('copy', () => window.__copyEvents++, true); });
    console.log('active before copy:', await page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('data-testid') ?? '')));
  }
  await page.keyboard.press('Control+C');
  if (args.debug) console.log('copy events:', await page.evaluate(() => window.__copyEvents));
  await page.waitForTimeout(400);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const expected = [1, 2].map(r => visibleFields.slice(0, 3).map(c => String(app_rows[r][c])).join('\t')).join('\n');
  check('Shift+click range copies as TSV', clip.trim() === expected, JSON.stringify(clip.slice(0, 80)));
}

// 9. Delete, cut and paste on a selection never write to the database.
{
  const updatesBefore = app.requests.filter(r => r.path === 'eval' && JSON.stringify(r.body).includes('update!')).length;
  await page.mouse.click(colX(2), rowY(5));
  await page.waitForTimeout(300);
  await page.keyboard.down('Shift');
  await page.mouse.click(colX(4), rowY(7));
  await page.keyboard.up('Shift');
  await page.waitForTimeout(300);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(300);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+X');
  await page.waitForTimeout(300);
  await page.evaluate(() => navigator.clipboard.writeText('pasted\tvalues'));
  await page.mouse.click(colX(2), rowY(8));
  await page.waitForTimeout(300);
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(1500);
  const updatesAfter = app.requests.filter(r => r.path === 'eval' && JSON.stringify(r.body).includes('update!')).length;
  check('Delete, cut and paste send no update', updatesAfter === updatesBefore, `${updatesAfter - updatesBefore} update(s) sent`);
}

// 13-16. What an edit says, and what refusing one says.
{
  const noticeText = async () => (await page.locator('[role="status"], [role="alert"]').filter({ hasText: /./ }).allInnerTexts()).join(' | ');
  const dismiss = async () => { await page.locator('[aria-label="Dismiss"]').first().click().catch(() => {}); await page.waitForTimeout(300); };
  await dismiss();

  // A successful save says so in the cell: it glows, then settles. No
  // snackbar. Compared against the same column one row down, away from the
  // row-hover highlight (the pointer is moved off the grid first).
  const bgAt = async (x, y) => (await page.screenshot({ clip: { x: x - 30, y: y - 12, width: 4, height: 4 } })).toString('base64');
  await page.mouse.dblclick(colX(3), rowY(2));
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('noted');
  await page.keyboard.press('Enter');
  await page.mouse.move(5, 500);
  await page.waitForTimeout(450);
  const glowing = (await bgAt(colX(3), rowY(2))) !== (await bgAt(colX(3), rowY(3)));
  let t = await noticeText();
  await page.waitForTimeout(2200);
  const settled = (await bgAt(colX(3), rowY(2))) === (await bgAt(colX(3), rowY(3)));
  check('a saved edit glows in its cell, settles, and says "Saved <column>"', glowing && settled && /^Saved created_at$/.test(t), `glowing=${glowing} settled=${settled} notice=${JSON.stringify(t)}`);

  // A refused one says why.
  await page.mouse.dblclick(colX(3), rowY(4));
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('FAIL');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  t = await noticeText();
  check('a failed edit says why, briefly', /^Couldn't save created_at: value too long/.test(t), t);
  await dismiss();

  // A table with no id in the result: no editor, the reason at once.
  const before = app.requests.filter(r => r.path === 'eval' && JSON.stringify(r.body).includes('update!')).length;
  await page.mouse.dblclick(colX(6), rowY(3));
  await page.waitForTimeout(700);
  t = await noticeText();
  const editorOpen = await page.locator('[data-results-cell-editor]').count();
  check('no id in the result: the reason, no editor', /user values can't be edited/.test(t) && editorOpen === 0, `${t} (editor open: ${editorOpen})`);
  await dismiss();
  // Typing on it says the same.
  await page.mouse.click(colX(6), rowY(3));
  await page.waitForTimeout(300);
  await page.keyboard.type('x');
  await page.waitForTimeout(500);
  t = await noticeText();
  check('typing on it says the same', /user values can't be edited/.test(t), t);
  await page.keyboard.press('Escape');
  await dismiss();

  // The id itself (visible unless hidden-ids).
  if (!HIDDEN) {
    await page.mouse.dblclick(colX(0), rowY(3));
    await page.waitForTimeout(700);
    t = await noticeText();
    check("the id column: the reason, no editor", /activity\.id can't be edited/.test(t) && (await page.locator('[data-results-cell-editor]').count()) === 0, t);
    await dismiss();
  }
  const after = app.requests.filter(r => r.path === 'eval' && JSON.stringify(r.body).includes('update!')).length;
  check('refused edits send no update', after === before, `${after - before} sent`);
}

// Helpers for the settings-driven checks below.
const openAppearance = async () => {
  await page.locator('button[aria-label="Settings"]:visible').first().click();
  await page.waitForTimeout(700);
  await page.getByText('Appearance', { exact: true }).first().click();
  await page.waitForTimeout(400);
};
const closeSettings = async () => {
  await page.locator('button[aria-label="Close settings"]:visible').first().click();
  await page.waitForTimeout(1200);
};
const gridStrip = async () => {
  const b = await page.locator('[data-results-grid]').boundingBox();
  return (await page.screenshot({ clip: { x: b.x + 2, y: b.y + 45, width: 300, height: 30 } })).toString('base64');
};
const editAndFind = async (x, y, text) => {
  await page.mouse.dblclick(x, y);
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+A');
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  return app.requests.filter(r => r.path === 'eval').map(r => JSON.stringify(r.body)).find(s => s.includes(text));
};

// 10. Changing the code font redraws the grid's text.
{
  const before = await gridStrip();
  await openAppearance();
  await page.getByRole('button', { name: /^Fira Code/ }).first().click().catch(async () => page.getByText('Fira Code', { exact: true }).first().click());
  await page.waitForTimeout(800);
  await closeSettings();
  const after = await gridStrip();
  check('code font change redraws the grid', before !== after);
}

// 11. Large text: rows grow with it, and a click still lands on the right row.
{
  await openAppearance();
  await page.getByRole('button', { name: 'Large', exact: true }).first().click().catch(async () => page.getByText('Large', { exact: true }).first().click());
  await page.waitForTimeout(800);
  await closeSettings();
  const b = await page.locator('[data-results-grid]').boundingBox();
  const scale = 1.25;
  // Widths don't scale (estimated per character at a fixed 8px), rows and header do.
  const y = b.y + 1 + Math.round(40 * scale) + 4 * Math.round(36 * scale) + Math.round(36 * scale) / 2;
  const upd = await editAndFind(colX(2) + (b.x - box.x), y, 'large text edit');
  check('Large text: an edit lands on the row clicked', !!upd && upd.includes(`where: id = ${app_rows[4][0]}`), upd ? upd.slice(0, 120) : 'no update sent');
  await openAppearance();
  await page.getByRole('button', { name: 'Medium', exact: true }).first().click().catch(async () => page.getByText('Medium', { exact: true }).first().click());
  await page.waitForTimeout(600);
  await closeSettings();
}

// 12. A second tab: the first tab's grid still draws and edits after switching back.
{
  await page.locator('[aria-label="New tab"]:visible').first().click({ timeout: 5000 }).catch(e => check('open a second tab', false, String(e).slice(0, 80)));
  await page.waitForTimeout(1200);
  await page.getByRole('tab').first().click().catch(async () => page.getByText(/USERID|activity/i).first().click());
  await page.waitForTimeout(1200);
  const visible = await page.locator('[data-results-grid]:visible').count();
  const b = visible ? await page.locator('[data-results-grid]:visible').first().boundingBox() : null;
  const upd = b ? await editAndFind(colX(2) + (b.x - box.x), rowY(5) + (b.y - box.y), 'second tab edit') : undefined;
  check('back from a second tab, the grid draws and edits', !!upd && upd.includes(`where: id = ${app_rows[5][0]}`), upd ? upd.slice(0, 120) : `grids visible: ${visible}`);
}

if (errors.length) report.push('Page errors:', ...[...new Set(errors)].map(e => '  ' + e.slice(0, 300)));
console.log(report.join('\n'));
await browser.close();
app.server.close();
