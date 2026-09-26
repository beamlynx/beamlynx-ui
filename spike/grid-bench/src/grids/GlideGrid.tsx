// Canvas-rendered candidate. No DOM per cell, so there is nothing for React
// to reconcile on a resize; the cost is one canvas redraw.
import '@glideapps/glide-data-grid/dist/index.css';
import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridColumn,
  type Item,
  type EditableGridCell,
  type Theme,
} from '@glideapps/glide-data-grid';
import React, { useCallback, useMemo } from 'react';
import { cellText } from '../data';
import type { GridProps } from './types';

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function GlideGrid(p: GridProps) {
  // Canvas cannot read CSS variables, so the theme is resolved once from the
  // live document - the real app would redo this when the theme, the code
  // font or the text size changes.
  const theme = useMemo<Partial<Theme>>(
    () => ({
      bgCell: cssVar('--canvas-node-bg'),
      bgHeader: cssVar('--canvas-chip-bg'),
      bgHeaderHovered: cssVar('--canvas-chip-bg'),
      bgHeaderHasFocus: cssVar('--canvas-chip-bg'),
      bgBubble: cssVar('--canvas-chip-bg'),
      textDark: cssVar('--canvas-text'),
      textMedium: cssVar('--canvas-text-dim'),
      textHeader: cssVar('--canvas-text'),
      borderColor: cssVar('--canvas-node-border'),
      horizontalBorderColor: cssVar('--canvas-node-border'),
      accentColor: cssVar('--canvas-trace'),
      fontFamily: cssVar('--code-font'),
      baseFontStyle: '14px',
      headerFontStyle: '600 14px',
    }),
    [],
  );

  const columns = useMemo<GridColumn[]>(
    () =>
      p.columns.map(c => ({
        id: c.field,
        title: c.headerName,
        width: p.widths[c.field],
        ...(p.headerColors[c.alias] && { themeOverride: { bgHeader: p.headerColors[c.alias] } }),
      })),
    [p.columns, p.widths, p.headerColors],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const field = p.columns[col].field;
      const text = cellText(p.rows[row][field]);
      return {
        kind: GridCellKind.Text,
        data: text,
        displayData: text,
        allowOverlay: !p.jsonFields.has(field),
        readonly: p.jsonFields.has(field),
      };
    },
    [p.columns, p.rows, p.jsonFields],
  );

  return (
    <div
      style={{ position: 'absolute', inset: 0, border: '1px solid var(--canvas-node-border)', borderRadius: 3, overflow: 'hidden' }}
    >
      <DataEditor
        width="100%"
        height="100%"
        theme={theme}
        columns={columns}
        rows={p.rows.length}
        getCellContent={getCellContent}
        rowHeight={36}
        headerHeight={40}
        smoothScrollX
        smoothScrollY
        onColumnResize={(col, width) => p.onWidthChange(col.id!, width)}
        onCellEdited={([col, row]: Item, value: EditableGridCell) => {
          if (value.kind === GridCellKind.Text) p.onCommitEdit(row, p.columns[col].field, value.data);
        }}
        onCellClicked={([col, row]: Item) => {
          const field = p.columns[col].field;
          if (p.jsonFields.has(field)) p.onJsonOpen(row, field);
        }}
        onCellContextMenu={([col, row]: Item, e) => {
          e.preventDefault();
          p.onCellContextMenu(row, p.columns[col].field, e.bounds.x + e.localEventX, e.bounds.y + e.localEventY);
        }}
      />
    </div>
  );
}
