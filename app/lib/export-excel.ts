/**
 * Excel/XLSX export helpers built on SheetJS (xlsx). Like the PDF module,
 * this imports xlsx dynamically so the ~600kB library doesn't bloat the
 * initial page bundle.
 *
 * The community edition of SheetJS has very limited cell styling support
 * (bold/colors would need xlsx-js-style). We still do what we can:
 *   - column widths,
 *   - frozen header row,
 *   - optional merged title rows spanning all columns.
 */

import { XLSX_MIME, shareOrDownload, type Destination } from './export';

export interface XlsxColumn<T> {
  header: string;
  cell: (row: T) => string | number;
  width?: number;
}

export interface ExportTableXlsxOptions<T> {
  filename: string;
  sheetName: string;
  columns: XlsxColumn<T>[];
  rows: T[];
  /** Optional title rows shown above the table, merged across all columns. */
  titleRows?: string[];
  destination?: Destination;
}

export async function exportTableXlsx<T>(
  opts: ExportTableXlsxOptions<T>,
): Promise<void> {
  const XLSX = await import('xlsx');

  const titleRows = opts.titleRows ?? [];
  const headers = opts.columns.map((c) => c.header);

  // Build the AOA (array of arrays) the way SheetJS wants it.
  const aoa: (string | number)[][] = [];
  for (const t of titleRows) {
    const row: (string | number)[] = [t];
    for (let i = 1; i < opts.columns.length; i++) row.push('');
    aoa.push(row);
  }
  aoa.push(headers);
  for (const r of opts.rows) {
    aoa.push(opts.columns.map((col) => col.cell(r)));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths (in characters). Fall back to something reasonable if
  // unspecified so long headers aren't clipped.
  ws['!cols'] = opts.columns.map((col) => ({
    wch: col.width ?? Math.max(10, col.header.length + 2),
  }));

  // Merge each title row across all columns so it reads as a banner.
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  titleRows.forEach((_, i) => {
    merges.push({ s: { r: i, c: 0 }, e: { r: i, c: Math.max(0, opts.columns.length - 1) } });
  });
  if (merges.length > 0) ws['!merges'] = merges;

  // Freeze the header row so it stays visible while scrolling.
  const headerRowIdx = titleRows.length;
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIdx + 1 };
  // Modern SheetJS reads freeze from views; include both for safety.
  (ws as unknown as { '!views'?: unknown[] })['!views'] = [
    { state: 'frozen', ySplit: headerRowIdx + 1, xSplit: 0, topLeftCell: 'A1' },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.substring(0, 31) || 'Hoja1');

  // Write to an ArrayBuffer then wrap as a Blob; avoids the writeFile path
  // that downloads automatically (we want to route through shareOrDownload).
  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: XLSX_MIME });
  await shareOrDownload(blob, `${opts.filename}.xlsx`, XLSX_MIME, opts.destination);
}

export interface EquiposEmpatadosXlsxGroup {
  filas: string[][];
  notas: string[];
}

export interface ExportEquiposEmpatadosXlsxOptions {
  filename: string;
  sheetName?: string;
  titleRows?: string[];
  headers: string[];
  grupos: EquiposEmpatadosXlsxGroup[];
  destination?: Destination;
}

/**
 * Export Equipos Empatados as a single sheet with one block per tied
 * group: a header row, the team rows, then the notes (FIBA criterion,
 * "tied at N points") as merged free-text rows. A blank row separates
 * groups so the sheet stays readable when groups have different shapes.
 */
export async function exportEquiposEmpatadosXlsx(
  opts: ExportEquiposEmpatadosXlsxOptions,
): Promise<void> {
  const XLSX = await import('xlsx');

  const titleRows = opts.titleRows ?? [];
  const headers = opts.headers;
  const colCount = headers.length;

  const aoa: (string | number)[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

  const padRow = (cells: (string | number)[]): (string | number)[] => {
    const out = cells.slice(0, colCount);
    while (out.length < colCount) out.push('');
    return out;
  };

  for (const t of titleRows) {
    merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: Math.max(0, colCount - 1) } });
    aoa.push(padRow([t]));
  }

  for (let gi = 0; gi < opts.grupos.length; gi++) {
    const grupo = opts.grupos[gi];
    aoa.push(padRow(headers));
    for (const fila of grupo.filas) {
      aoa.push(padRow(fila));
    }
    for (const nota of grupo.notas) {
      merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: Math.max(0, colCount - 1) } });
      aoa.push(padRow([nota]));
    }
    if (gi < opts.grupos.length - 1) {
      aoa.push(padRow([]));
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = headers.map((h, i) => ({
    wch: i === 0 ? Math.max(22, h.length + 2) : Math.max(14, h.length + 2),
  }));

  if (merges.length > 0) ws['!merges'] = merges;

  const wb = XLSX.utils.book_new();
  const sheetName = (opts.sheetName ?? 'Equipos Empatados').substring(0, 31) || 'Hoja1';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: XLSX_MIME });
  await shareOrDownload(blob, `${opts.filename}.xlsx`, XLSX_MIME, opts.destination);
}
