// Shared by app.mjs (timings) and app-features.mjs (behavior): serves the
// desktop static export and answers every pine-lang API call with a mock,
// in the browser, so nothing reaches a real server or database.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export function startApp({ out, rows, cols, hiddenIds = false }) {
  const OUT = out, ROWS = rows, COLS = cols;
  // ---- static server for the export ----
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.png': 'image/png' };
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(OUT, p);
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    } catch {
      file = path.join(OUT, 'index.html');
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  let PORT;
  const ready = new Promise(r => server.listen(0, () => { PORT = server.address().port; r(); }));

  // ---- mock data: the same shape as the bench page's ----
  const ALIASES = ['a_0', 'u_0', 'd_0', 't_0'];
  const TABLES = ['activity', 'user', 'document', 'tenant'];
  const NAMES = ['id', 'userId', 'title', 'created_at', 'email', 'is_active', 'description', 'tenantId', 'deleted_at', 'metadata'];
  const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima'];
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function evalResponse(rows, seed) {
    const r = rng(seed);
    const w = () => WORDS[Math.floor(r() * WORDS.length)];
    const columns = Array.from({ length: COLS }, (_, i) => ({
      alias: ALIASES[Math.floor(i / Math.ceil(COLS / 4))] ?? 'a_0',
      column: NAMES[i % 10],
      'column-alias': NAMES[i % 10] + (i >= 10 ? `_${Math.floor(i / 10)}` : ''),
      // hiddenIds: id columns come back hidden, as for a query that selects
      // specific columns - kept for updates, not shown.
      hidden: hiddenIds && NAMES[i % 10] === 'id',
    }));
    const result = [columns.map(c => c['column-alias'])];
    for (let n = 0; n < rows; n++) {
      result.push(columns.map((c, i) => {
        switch (i % 10) {
          case 0: case 1: case 7: return Math.floor(r() * 1e6);
          case 2: case 4: return `${w()} ${w()}`;
          case 3: return new Date(1.7e12 + Math.floor(r() * 3e10)).toISOString();
          case 5: return r() > 0.5;
          case 6: return Array.from({ length: 4 + Math.floor(r() * 12) }, w).join(' ');
          case 8: return r() > 0.7 ? new Date(1.7e12).toISOString() : null;
          case 9: return JSON.stringify({ plan: w(), seats: Math.floor(r() * 50), tags: [w(), w()] });
        }
      }));
    }
    return { 'connection-id': 'bench', version: '0.46.0', result, columns, query: 'SELECT 1', writes: false };
  }
  const EXPRESSION = 'activity | user .userId | document .userId | tenant';
  const AST = {
    hints: { table: [], select: [], order: [], where: [] },
    'selected-tables': TABLES.map((t, i) => ({ schema: 'public', table: t, alias: ALIASES[i] })),
    joins: [],
    context: 't_0', current: 't_0',
    operation: { type: 'table', value: 'tenant' },
    columns: [], order: [], where: [], group: [],
    prettified: EXPRESSION, ranges: [],
  };

  const requests = [];
  let lastEvalBody = null;
  async function mockApi(page) {
    await page.route('http://localhost:33333/**', async route => {
      const url = new URL(route.request().url());
      const p = url.pathname.replace('/api/v1/', '');
      if (route.request().method() === 'POST') requests.push({ path: p, body: route.request().postDataJSON() });
      const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (p === 'connection') return json({ result: { version: '0.46.0', 'connection-id': 'bench' } });
      if (p === 'connections') return json({ result: { version: '0.46.0', 'selected-connection-id': 'bench', connections: [{ id: 'bench', host: 'localhost', port: 5432, dbname: 'bench', user: 'bench' }] } });
      if (p === 'connection/stats') return json({ 'connection-count': 1, time: new Date().toISOString() });
      // Echo the expression back as its own prettified form: the app builds
      // update expressions by piping onto whatever build returns.
      if (p === 'build') {
        const sent = route.request().postDataJSON()?.expressions?.at(-1) ?? EXPRESSION;
        return json({ 'connection-id': 'bench', version: '0.46.0', ast: { ...AST, prettified: sent }, query: 'SELECT 1', doc: null });
      }
      // The same data for every run, so a check can compute what is on screen.
      if (p === 'eval') { lastEvalBody = evalResponse(ROWS, 1); return json(lastEvalBody); }
      return json({ result: null });
    });
  }

  const SEED_STORAGE = (expression) => {
    localStorage.setItem('pine-sessions', JSON.stringify({ sessions: [{ expression, inputMode: 'pine', connectionId: 'bench', profileId: '' }], activeIndex: 0 }));
    localStorage.setItem('pine-new-layout-panel-visible', 'true');
    localStorage.setItem('pine-theme', '"dark"');
    localStorage.setItem('pine-last-read-version', '"999.0.0"');
  };

  // The probe from the bench page, injected into the app.
  const PROBE = () => {
    window.__probe = (timers) => {
      let running = true, blocked = 0, maxGap = 0, last = performance.now();
      const tick = () => { if (!running) return; const now = performance.now(); const g = now - last; last = now; if (g > 16) blocked += g - 16; if (g > maxGap) maxGap = g; setTimeout(tick, 0); };
      if (timers) setTimeout(tick, 0);
      let frames = 0, slow = 0, maxF = 0, lf = performance.now();
      const fr = t => { if (!running) return; const d = t - lf; lf = t; frames++; if (d > 33) slow++; if (d > maxF) maxF = d; requestAnimationFrame(fr); };
      requestAnimationFrame(t => { lf = t; requestAnimationFrame(fr); });
      let lt = 0, ltMs = 0;
      const obs = new PerformanceObserver(l => { for (const e of l.getEntries()) { lt++; ltMs += e.duration; } });
      obs.observe({ type: 'longtask' });
      return () => { running = false; obs.disconnect(); return { blockedMs: Math.round(blocked), maxGapMs: Math.round(maxGap), longTaskMs: Math.round(ltMs), longTasks: lt, frames, slowFrames: slow, maxFrameMs: Math.round(maxF) }; };
    };
  };

  return ready.then(() => ({ PORT, server, mockApi, SEED_STORAGE, PROBE, EXPRESSION, requests, lastEval: () => lastEvalBody }));
}
