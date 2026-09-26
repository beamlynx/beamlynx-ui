// Deterministic rows shaped like a real Pine result: columns keyed by their
// stringified index ("0", "1", ...), a positional `_id`, and a mix of the
// value shapes a multi-table join actually produces.

export interface BenchColumn {
  field: string;
  headerName: string;
  alias: string;
  kind: 'int' | 'uuid' | 'text' | 'long' | 'ts' | 'bool' | 'json' | 'nullish';
}

export type BenchRow = Record<string, unknown> & { _id: number };

const KINDS: BenchColumn['kind'][] = [
  'int', 'uuid', 'text', 'ts', 'text', 'bool', 'long', 'int', 'nullish', 'json',
];
const ALIASES = ['a_0', 'u_0', 'd_0', 't_0'];
const NAMES = ['id', 'userId', 'title', 'created_at', 'email', 'is_active', 'description',
  'tenantId', 'deleted_at', 'metadata'];
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
  'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa'];

// mulberry32 - small, fast, seedable.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeColumns(count: number): BenchColumn[] {
  return Array.from({ length: count }, (_, i) => ({
    field: String(i),
    headerName: NAMES[i % NAMES.length] + (i >= NAMES.length ? `_${Math.floor(i / NAMES.length)}` : ''),
    alias: ALIASES[Math.floor(i / Math.ceil(count / ALIASES.length))] ?? ALIASES[0],
    kind: KINDS[i % KINDS.length],
  }));
}

export function makeRows(columns: BenchColumn[], count: number, seed = 1): BenchRow[] {
  const r = rng(seed);
  const word = () => WORDS[Math.floor(r() * WORDS.length)];
  const rows: BenchRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const row: BenchRow = { _id: i };
    for (const col of columns) {
      let v: unknown;
      switch (col.kind) {
        case 'int': v = Math.floor(r() * 1_000_000); break;
        case 'uuid': v = `${(r() * 0xffffffff >>> 0).toString(16).padStart(8, '0')}-4b1c-9a2e-${(r() * 0xffffffff >>> 0).toString(16).padStart(8, '0')}`; break;
        case 'text': v = `${word()} ${word()}`; break;
        case 'long': v = Array.from({ length: 4 + Math.floor(r() * 12) }, word).join(' '); break;
        case 'ts': v = new Date(1.7e12 + Math.floor(r() * 3e10)).toISOString(); break;
        case 'bool': v = r() > 0.5; break;
        case 'nullish': v = r() > 0.7 ? new Date(1.7e12).toISOString() : null; break;
        case 'json': v = JSON.stringify({ plan: word(), seats: Math.floor(r() * 50), tags: [word(), word()] }); break;
      }
      row[col.field] = v;
    }
    rows[i] = row;
  }
  return rows;
}

// The same sizing arithmetic as beamlynx-ui/components/column-width.util.ts.
export function estimateWidth(rows: BenchRow[], col: BenchColumn): number {
  const min = 100, max = 400;
  if (col.kind === 'json') return Math.round((min + max) / 2);
  let longest = col.headerName.length;
  const limit = Math.min(rows.length, 50);
  for (let i = 0; i < limit; i++) {
    const v = rows[i][col.field];
    if (v == null) continue;
    const t = typeof v === 'string' ? v : String(v);
    if (t.length > longest) longest = t.length;
  }
  return Math.min(Math.max(longest * 8 + 32, min), max);
}

export function cellText(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}
