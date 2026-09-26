// A DOM grid we would own: plain <div> rows virtualized by
// @tanstack/react-virtual, no styling runtime, no per-cell closures.
//
// The choices that make a resize cost nothing:
// - Column widths live in ONE CSS custom property on the root
//   (--lx-cols, a grid-template-columns value). Every row is
//   `display: grid` and reads it. Dragging a column edge writes that one
//   property; React does not re-render.
// - All columns render; only rows are virtualized. A container width change
//   therefore changes nothing React knows about. The browser clips or
//   reveals more of the same DOM, the way it does when scrolling.
// - Rows are memoized by index and positioned at index * ROW_HEIGHT, so a
//   scroll that moves the window re-renders only rows entering it.
// - Clicks, double-clicks and right-clicks are handled once, on the body,
//   from data-r/data-f attributes.
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cellText, type BenchColumn, type BenchRow } from '../data';
import type { GridProps } from './types';

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 40;

const CSS = `
.lx-root { position: absolute; inset: 0; border: 1px solid var(--canvas-node-border); border-radius: 3px;
  overflow: hidden; background: var(--canvas-node-bg); color: var(--canvas-text);
  font-family: var(--code-font); font-size: 0.875rem; }
.lx-scroller { position: absolute; inset: 0; overflow: auto; contain: strict; }
.lx-scroller::-webkit-scrollbar { width: 10px; height: 10px; }
.lx-scroller::-webkit-scrollbar-thumb { background: var(--canvas-pin); border-radius: 5px; }
.lx-header { position: sticky; top: 0; z-index: 2; display: grid; grid-template-columns: var(--lx-cols);
  height: ${HEADER_HEIGHT}px; background: var(--canvas-chip-bg); border-bottom: 1px solid var(--canvas-node-border); }
.lx-hcell { position: relative; display: flex; align-items: center; padding: 0 10px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lx-resize { position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: col-resize; }
.lx-resize:hover { background: var(--canvas-trace); }
.lx-row { position: absolute; top: 0; left: 0; display: grid; grid-template-columns: var(--lx-cols);
  height: ${ROW_HEIGHT}px; border-bottom: 1px solid var(--canvas-node-border); user-select: none; contain: layout style; }
.lx-row:hover { background: var(--canvas-chip-bg); }
.lx-cell { padding: 0 10px; min-width: 0; line-height: ${ROW_HEIGHT - 1}px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lx-json { cursor: pointer; }
.lx-cell input { width: 100%; height: 100%; border: none; outline: 1px solid var(--canvas-trace);
  background: var(--canvas-node-bg); color: inherit; font: inherit; padding: 0 6px; }
`;

let injected = false;
export function injectCss() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
}

interface RowProps {
  row: BenchRow;
  index: number;
  columns: BenchColumn[];
  jsonFields: Set<string>;
  editingField: string | null;
  onCommit: (value: string | null) => void;
}

export const Row = memo(function Row({ row, index, columns, jsonFields, editingField, onCommit }: RowProps) {
  return (
    <div className="lx-row" data-r={index} style={{ transform: `translateY(${HEADER_HEIGHT + index * ROW_HEIGHT}px)` }}>
      {columns.map(c =>
        c.field === editingField ? (
          <div key={c.field} className="lx-cell">
            <EditInput initial={cellText(row[c.field])} onCommit={onCommit} />
          </div>
        ) : (
          <div key={c.field} className={jsonFields.has(c.field) ? 'lx-cell lx-json' : 'lx-cell'} data-f={c.field}>
            {cellText(row[c.field])}
          </div>
        ),
      )}
    </div>
  );
});

function EditInput({ initial, onCommit }: { initial: string; onCommit: (v: string | null) => void }) {
  const [v, setV] = useState(initial);
  return (
    <input
      autoFocus
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => onCommit(null)}
      onKeyDown={e => {
        if (e.key === 'Enter') onCommit(v);
        if (e.key === 'Escape') onCommit(null);
      }}
    />
  );
}

export function colsTemplate(columns: BenchColumn[], widths: Record<string, number>) {
  return columns.map(c => `${widths[c.field]}px`).join(' ');
}

export default function TanstackGrid(p: GridProps) {
  injectCss();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<{ r: number; f: string } | null>(null);

  const totalWidth = useMemo(
    () => p.columns.reduce((sum, c) => sum + p.widths[c.field], 0),
    [p.columns, p.widths],
  );

  // Widths reach the DOM through one custom property, set outside render so
  // a live drag (below) and a committed width (here) write the same place.
  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--lx-cols', colsTemplate(p.columns, p.widths));
  }, [p.columns, p.widths]);

  const virtualizer = useVirtualizer({
    count: p.rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
    // The React adapter otherwise flushSync()s a render on every scroll
    // event, which is most of what a fast scroll costs.
    useFlushSync: false,
    scrollPaddingStart: HEADER_HEIGHT,
  });

  const startResize = (e: React.PointerEvent, col: BenchColumn) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = p.widths[col.field];
    const live = { ...p.widths };
    const move = (ev: PointerEvent) => {
      live[col.field] = Math.max(40, startW + ev.clientX - startX);
      rootRef.current?.style.setProperty('--lx-cols', colsTemplate(p.columns, live));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      p.onWidthChange(col.field, live[col.field]);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const hit = (e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-f]');
    const row = cell?.closest<HTMLElement>('[data-r]');
    return cell && row ? { r: Number(row.dataset.r), f: cell.dataset.f! } : null;
  };

  const onCommit = useCallback(
    (value: string | null) => {
      setEditing(cur => {
        if (cur && value !== null) p.onCommitEdit(cur.r, cur.f, value);
        return null;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.onCommitEdit],
  );

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
          if (h && !p.jsonFields.has(h.f)) setEditing(h);
        }}
        onContextMenu={e => {
          const h = hit(e);
          if (!h) return;
          e.preventDefault();
          p.onCellContextMenu(h.r, h.f, e.clientX, e.clientY);
        }}
      >
        <div style={{ height: HEADER_HEIGHT + virtualizer.getTotalSize(), width: totalWidth, position: 'relative' }}>
          <div className="lx-header" style={{ width: totalWidth }}>
            {p.columns.map(c => (
              <div
                key={c.field}
                className="lx-hcell"
                style={p.headerColors[c.alias] ? { background: p.headerColors[c.alias] } : undefined}
              >
                {c.headerName}
                <div className="lx-resize" onPointerDown={e => startResize(e, c)} />
              </div>
            ))}
          </div>
          {virtualizer.getVirtualItems().map(item => (
            <Row
              key={item.index}
              row={p.rows[item.index]}
              index={item.index}
              columns={p.columns}
              jsonFields={p.jsonFields}
              editingField={editing?.r === item.index ? editing.f : null}
              onCommit={onCommit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
