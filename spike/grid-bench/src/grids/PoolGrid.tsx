// A DOM grid with no React in the body. React renders the shell (scroller,
// header, spacer) and an edit overlay; the rows are a fixed pool of plain
// elements, created once and recycled imperatively.
//
// Row i always lives in pool slot i % poolSize. A row that stays in view
// keeps its slot and is never touched again; a scroll only writes the rows
// entering the view - a few textContent assignments per frame. Nothing
// reconciles, nothing diffs, and a width change does nothing at all.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cellText, type BenchColumn, type BenchRow } from '../data';
import type { GridProps } from './types';
import { colsTemplate, HEADER_HEIGHT, injectCss, ROW_HEIGHT } from './TanstackGrid';

const OVERSCAN = 6;

interface Slot {
  el: HTMLDivElement;
  cells: HTMLDivElement[];
  row: number; // -1 = unassigned
}

function buildSlot(columns: BenchColumn[], jsonFields: Set<string>): Slot {
  const el = document.createElement('div');
  el.className = 'lx-row';
  const cells = columns.map(c => {
    const cell = document.createElement('div');
    cell.className = jsonFields.has(c.field) ? 'lx-cell lx-json' : 'lx-cell';
    cell.dataset.f = c.field;
    el.appendChild(cell);
    return cell;
  });
  return { el, cells, row: -1 };
}

export default function PoolGrid(p: GridProps) {
  injectCss();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const latest = useRef(p);
  latest.current = p;
  const [editing, setEditing] = useState<{ r: number; f: string; value: string } | null>(null);

  const totalWidth = useMemo(() => p.columns.reduce((s, c) => s + p.widths[c.field], 0), [p.columns, p.widths]);

  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--lx-cols', colsTemplate(p.columns, p.widths));
  }, [p.columns, p.widths]);

  // The pool. Rebuilt only when the column set changes; new rows (a swap)
  // just invalidate every slot.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current!;
    const body = bodyRef.current!;
    let slots: Slot[] = [];
    let height = scroller.clientHeight;

    const ensurePool = () => {
      const need = Math.ceil(height / ROW_HEIGHT) + 2 * OVERSCAN;
      while (slots.length < need) {
        const s = buildSlot(latest.current.columns, latest.current.jsonFields);
        body.appendChild(s.el);
        slots.push(s);
      }
      // Slot assignment depends on pool size, so a resize reassigns all.
      slots.forEach(s => (s.row = -1));
    };

    const paint = () => {
      const { rows, columns } = latest.current;
      const n = slots.length;
      const first = Math.max(0, Math.floor((scroller.scrollTop - HEADER_HEIGHT) / ROW_HEIGHT) - OVERSCAN);
      const last = Math.min(rows.length, first + n);
      for (let r = first; r < last; r++) {
        const s = slots[r % n];
        if (s.row === r) continue;
        s.row = r;
        s.el.dataset.r = String(r);
        s.el.style.transform = `translateY(${HEADER_HEIGHT + r * ROW_HEIGHT}px)`;
        s.el.style.display = '';
        const row = rows[r];
        for (let c = 0; c < columns.length; c++) s.cells[c].textContent = cellText(row[columns[c].field]);
      }
      // Slots with no row in range (the end of a short result) are hidden.
      for (const s of slots) {
        if (s.row < first || s.row >= last) {
          s.el.style.display = 'none';
          s.row = -1;
        }
      }
    };

    ensurePool();
    paint();
    const onScroll = () => paint();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h === height) return; // width-only: nothing to do
      height = h;
      ensurePool();
      paint();
    });
    ro.observe(scroller);
    (scroller as any).__repaint = () => {
      slots.forEach(s => (s.row = -1));
      paint();
    };
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      ro.disconnect();
      slots.forEach(s => s.el.remove());
    };
  }, [p.columns, p.jsonFields]);

  // New rows: every slot is stale.
  useLayoutEffect(() => {
    (scrollerRef.current as any)?.__repaint?.();
  }, [p.rows]);

  const onResizeStart = (e: React.PointerEvent, col: BenchColumn) => {
    e.preventDefault();
    e.stopPropagation();
    const { columns, widths, onWidthChange } = latest.current;
    const startX = e.clientX;
    const live = { ...widths };
    const move = (ev: PointerEvent) => {
      live[col.field] = Math.max(40, widths[col.field] + ev.clientX - startX);
      rootRef.current?.style.setProperty('--lx-cols', colsTemplate(columns, live));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onWidthChange(col.field, live[col.field]);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hit = (e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-f]');
    const row = cell?.closest<HTMLElement>('[data-r]');
    return cell && row ? { r: Number(row.dataset.r), f: cell.dataset.f! } : null;
  };

  const editLeft = editing
    ? p.columns.slice(0, p.columns.findIndex(c => c.field === editing.f)).reduce((s, c) => s + p.widths[c.field], 0)
    : 0;

  return (
    <div className="lx-root" ref={rootRef}>
      <div
        className="lx-scroller"
        data-lynx-scroller
        ref={scrollerRef}
        onClick={e => {
          const h = hit(e);
          if (h && p.jsonFields.has(h.f)) p.onJsonOpen(h.r, h.f);
        }}
        onDoubleClick={e => {
          const h = hit(e);
          if (h && !p.jsonFields.has(h.f)) setEditing({ ...h, value: cellText(p.rows[h.r][h.f]) });
        }}
        onContextMenu={e => {
          const h = hit(e);
          if (!h) return;
          e.preventDefault();
          p.onCellContextMenu(h.r, h.f, e.clientX, e.clientY);
        }}
      >
        <div ref={bodyRef} style={{ height: HEADER_HEIGHT + p.rows.length * ROW_HEIGHT, width: totalWidth, position: 'relative' }}>
          <div className="lx-header" style={{ width: totalWidth }}>
            {p.columns.map(c => (
              <div key={c.field} className="lx-hcell" style={p.headerColors[c.alias] ? { background: p.headerColors[c.alias] } : undefined}>
                {c.headerName}
                <div className="lx-resize" onPointerDown={e => onResizeStart(e, c)} />
              </div>
            ))}
          </div>
          {editing && (
            <div
              className="lx-cell"
              style={{
                position: 'absolute', zIndex: 1, left: editLeft, width: p.widths[editing.f], height: ROW_HEIGHT,
                top: HEADER_HEIGHT + editing.r * ROW_HEIGHT, padding: 0,
              }}
            >
              <input
                autoFocus
                defaultValue={editing.value}
                onBlur={() => setEditing(null)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    p.onCommitEdit(editing.r, editing.f, (e.target as HTMLInputElement).value);
                    setEditing(null);
                  }
                  if (e.key === 'Escape') setEditing(null);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
