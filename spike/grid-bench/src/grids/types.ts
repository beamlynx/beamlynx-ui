import type { BenchColumn, BenchRow } from '../data';

export interface GridProps {
  columns: BenchColumn[];
  rows: BenchRow[];
  /** Estimated or user-resized width per field; owned outside the grid so it survives a remount. */
  widths: Record<string, number>;
  onWidthChange: (field: string, width: number) => void;
  /** Header tint per alias; empty when table colors are off. */
  headerColors: Record<string, string>;
  jsonFields: Set<string>;
  onJsonOpen: (rowIndex: number, field: string) => void;
  onCommitEdit: (rowIndex: number, field: string, value: string) => void;
  onCellContextMenu: (rowIndex: number, field: string, x: number, y: number) => void;
}

/** The element that scrolls vertically, for the bench's scroll scenario. */
export const SCROLLER_SELECTOR: Record<string, string> = {
  mui: '.MuiDataGrid-virtualScroller',
  tanstack: '[data-lynx-scroller]',
  glide: '.dvn-scroller',
  ag: '.ag-grid-viewport',
  lynx: '[data-lynx-scroller]',
  pool: '[data-lynx-scroller]',
};

/** A rendered row, for detecting a scroll frame that painted before its rows did. Canvas grids have none. */
export const ROW_SELECTOR: Record<string, string | null> = {
  mui: '.MuiDataGrid-row',
  tanstack: '.lx-row',
  lynx: '.lx-row',
  pool: '.lx-row',
  glide: null,
  ag: '.ag-row',
};
