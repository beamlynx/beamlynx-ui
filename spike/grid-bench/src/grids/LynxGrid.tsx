// The same DOM grid as TanstackGrid, with the virtualization written by hand
// so React only renders when it has to:
// - The window of rendered rows moves in chunks of CHUNK rows. A scroll
//   that stays inside the current chunk costs no React work at all; the
//   browser just scrolls DOM that is already there.
// - Only a height change can alter how many rows are needed. A width change
//   is not observed at all.
// - The header is its own memoized component, so a window move does not
//   re-render it.
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BenchColumn } from '../data';
import type { GridProps } from './types';
import { colsTemplate, HEADER_HEIGHT, injectCss, Row, ROW_HEIGHT } from './TanstackGrid';

const CHUNK = 8;

interface HeaderProps {
  columns: BenchColumn[];
  headerColors: Record<string, string>;
  totalWidth: number;
  onResizeStart: (e: React.PointerEvent, col: BenchColumn) => void;
}

const Header = memo(function Header({ columns, headerColors, totalWidth, onResizeStart }: HeaderProps) {
  return (
    <div className="lx-header" style={{ width: totalWidth }}>
      {columns.map(c => (
        <div key={c.field} className="lx-hcell" style={headerColors[c.alias] ? { background: headerColors[c.alias] } : undefined}>
          {c.headerName}
          <div className="lx-resize" onPointerDown={e => onResizeStart(e, c)} />
        </div>
      ))}
    </div>
  );
});

function windowFor(scrollTop: number, viewport: number, count: number) {
  const first = Math.floor(Math.max(0, scrollTop - HEADER_HEIGHT) / ROW_HEIGHT);
  const start = Math.max(0, Math.floor(first / CHUNK) * CHUNK - CHUNK);
  const visible = Math.ceil(viewport / ROW_HEIGHT);
  const end = Math.min(count, start + visible + 3 * CHUNK);
  return { start, end };
}

export default function LynxGrid(p: GridProps) {
  injectCss();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [win, setWin] = useState(() => windowFor(0, 1200, p.rows.length));
  const [editing, setEditing] = useState<{ r: number; f: string } | null>(null);

  const latest = useRef(p);
  latest.current = p;

  const totalWidth = useMemo(() => p.columns.reduce((s, c) => s + p.widths[c.field], 0), [p.columns, p.widths]);

  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--lx-cols', colsTemplate(p.columns, p.widths));
  }, [p.columns, p.widths]);

  useEffect(() => {
    const el = scrollerRef.current!;
    let height = el.clientHeight;
    const update = () => {
      const next = windowFor(el.scrollTop, height, latest.current.rows.length);
      setWin(cur => (cur.start === next.start && cur.end === next.end ? cur : next));
    };
    const ro = new ResizeObserver(entries => {
      const h = entries[0].contentRect.height;
      if (h === height) return; // a width-only change: nothing to do
      height = h;
      update();
    });
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, [p.rows.length]);

  const onResizeStart = useCallback((e: React.PointerEvent, col: BenchColumn) => {
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
  }, []);

  const onCommit = useCallback((value: string | null) => {
    setEditing(cur => {
      if (cur && value !== null) latest.current.onCommitEdit(cur.r, cur.f, value);
      return null;
    });
  }, []);

  const hit = (e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-f]');
    const row = cell?.closest<HTMLElement>('[data-r]');
    return cell && row ? { r: Number(row.dataset.r), f: cell.dataset.f! } : null;
  };

  const rows = [];
  for (let i = win.start; i < win.end; i++) {
    rows.push(
      <Row
        key={i}
        row={p.rows[i]}
        index={i}
        columns={p.columns}
        jsonFields={p.jsonFields}
        editingField={editing?.r === i ? editing.f : null}
        onCommit={onCommit}
      />,
    );
  }

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
        <div style={{ height: HEADER_HEIGHT + p.rows.length * ROW_HEIGHT, width: totalWidth, position: 'relative' }}>
          <Header columns={p.columns} headerColors={p.headerColors} totalWidth={totalWidth} onResizeStart={onResizeStart} />
          {rows}
        </div>
      </div>
    </div>
  );
}
