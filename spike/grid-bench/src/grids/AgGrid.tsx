// AG Grid Community: a full-featured grid whose core is framework-agnostic
// DOM code, with React only as a wrapper.
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import React, { useMemo } from 'react';
import type { GridProps } from './types';

ModuleRegistry.registerModules([AllCommunityModule]);

const theme = themeQuartz.withParams({
  backgroundColor: 'var(--canvas-node-bg)',
  foregroundColor: 'var(--canvas-text)',
  headerBackgroundColor: 'var(--canvas-chip-bg)',
  borderColor: 'var(--canvas-node-border)',
  rowHoverColor: 'var(--canvas-chip-bg)',
  accentColor: 'var(--canvas-trace)',
  fontFamily: 'var(--code-font)',
  fontSize: 14,
  rowHeight: 36,
  headerHeight: 40,
  wrapperBorderRadius: 3,
});

export default function AgGrid(p: GridProps) {
  const columnDefs = useMemo<ColDef[]>(
    () =>
      p.columns.map(c => ({
        colId: c.field,
        headerName: c.headerName,
        valueGetter: params => params.data[c.field],
        valueSetter: params => { params.data[c.field] = params.newValue; return true; },
        width: p.widths[c.field],
        editable: !p.jsonFields.has(c.field),
        sortable: true,
        resizable: true,
        ...(p.headerColors[c.alias] && { headerStyle: { backgroundColor: p.headerColors[c.alias] } }),
      })),
    [p.columns, p.widths, p.headerColors, p.jsonFields],
  );

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <AgGridReact
        theme={theme}
        rowData={p.rows}
        columnDefs={columnDefs}
        getRowId={params => String(params.data._id)}
        suppressContextMenu
        onColumnResized={e => {
          if (e.finished && e.column) p.onWidthChange(e.column.getColId(), e.column.getActualWidth());
        }}
        onCellValueChanged={e => p.onCommitEdit(e.data._id, e.colDef.colId!, String(e.newValue))}
        onCellClicked={e => {
          if (p.jsonFields.has(e.colDef.colId!)) p.onJsonOpen(e.data._id, e.colDef.colId!);
        }}
        onCellContextMenu={e => {
          const ev = e.event as MouseEvent;
          ev.preventDefault();
          p.onCellContextMenu(e.data._id, e.colDef.colId!, ev.clientX, ev.clientY);
        }}
      />
    </div>
  );
}
