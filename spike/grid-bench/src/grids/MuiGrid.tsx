// The baseline: MUI DataGrid Community configured as beamlynx-ui's
// Result.tsx configures it, with its sx copied verbatim (Emotion's cost is
// part of what is being measured).
import { DataGrid } from '@mui/x-data-grid';
import React, { useMemo, useState } from 'react';
import type { GridProps } from './types';

function EditCell(props: any) {
  const { id, field, value, api } = props;
  const [v, setV] = useState(value ?? '');
  return (
    <input
      autoFocus
      value={v}
      onChange={e => {
        setV(e.target.value);
        api.setEditCellValue({ id, field, value: e.target.value });
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') api.stopCellEditMode({ id, field });
        if (e.key === 'Escape') api.stopCellEditMode({ id, field, ignoreModifications: true });
      }}
      style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', height: '100%', padding: 8, font: 'inherit', color: 'inherit' }}
    />
  );
}

export default function MuiGrid(p: GridProps) {
  const columns = useMemo(
    () =>
      p.columns.map(c => ({
        field: c.field,
        headerName: c.headerName,
        width: p.widths[c.field],
        editable: !p.jsonFields.has(c.field),
        disableReorder: true,
        headerClassName: p.headerColors[c.alias] ? `result-col-${c.alias}` : undefined,
        renderEditCell: (params: any) => <EditCell {...params} />,
        ...(p.jsonFields.has(c.field) && {
          renderCell: (params: any) => (
            <div
              onClick={() => p.onJsonOpen(params.row._id, c.field)}
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', cursor: 'pointer' }}
            >
              {String(params.value)}
            </div>
          ),
        }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.columns, p.widths, p.headerColors, p.jsonFields],
  );
  const colorSx = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(p.headerColors).map(([alias, color]) => [
          `& .MuiDataGrid-columnHeader.result-col-${alias}`,
          { backgroundColor: color },
        ]),
      ),
    [p.headerColors],
  );

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onContextMenu={e => {
        const cell = (e.target as HTMLElement).closest('.MuiDataGrid-cell');
        const row = cell?.closest('.MuiDataGrid-row');
        if (!cell || !row) return;
        e.preventDefault();
        p.onCellContextMenu(Number(row.getAttribute('data-rowindex')), cell.getAttribute('data-field')!, e.clientX, e.clientY);
      }}
    >
      <DataGrid
        sx={{
          height: '100%',
          '--DataGrid-containerBackground': 'var(--canvas-node-bg)',
          '--DataGrid-rowBorderColor': 'var(--canvas-node-border)',
          color: 'var(--canvas-text)',
          fontFamily: 'var(--code-font)',
          fontSize: '0.875rem',
          border: '1px solid var(--canvas-node-border)',
          borderRadius: '3px',
          overflow: 'hidden',
          '& .MuiDataGrid-withBorderColor': { borderColor: 'transparent' },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'var(--canvas-chip-bg)',
            borderBottom: '1px solid var(--canvas-node-border)',
          },
          '& .MuiDataGrid-columnHeaderTitle': { color: 'var(--canvas-text)', fontWeight: 600 },
          '& .MuiDataGrid-cell': {
            color: 'var(--canvas-text)',
            borderBottom: '1px solid var(--canvas-node-border)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          },
          ...colorSx,
          '& .MuiDataGrid-row:hover': { backgroundColor: 'var(--canvas-chip-bg)' },
          '& .MuiTablePagination-root, & .MuiTablePagination-root .MuiSvgIcon-root, & .MuiTablePagination-root .MuiIconButton-root':
            { color: 'var(--canvas-text-dim)', fontFamily: 'var(--canvas-font)' },
          '& ::-webkit-scrollbar': { width: '10px', height: '10px' },
          '& ::-webkit-scrollbar-track': { background: 'transparent' },
          '& ::-webkit-scrollbar-thumb': { backgroundColor: 'var(--canvas-pin)', borderRadius: '5px' },
          '& ::-webkit-scrollbar-thumb:hover': { background: 'var(--canvas-trace)' },
        }}
        density="compact"
        rows={p.rows}
        columns={columns}
        getRowId={row => row._id}
        processRowUpdate={(newRow, oldRow) => {
          const f = Object.keys(newRow).find(k => newRow[k] !== oldRow[k]);
          if (f) p.onCommitEdit(newRow._id, f, String(newRow[f]));
          return newRow;
        }}
        onColumnWidthChange={params => p.onWidthChange(params.colDef.field, params.width)}
      />
    </div>
  );
}
