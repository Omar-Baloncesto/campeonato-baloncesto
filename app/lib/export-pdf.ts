/**
 * PDF export helpers built on top of jsPDF + jspdf-autotable.
 *
 * Three flavours:
 *   - exportTablePdf: for pages whose content is naturally a table
 *     (posiciones, fixture, stats, etc.).
 *   - exportVisualPdf: for pages whose layout is rich/non-tabular and
 *     should be captured from the DOM with html2canvas (Bracket).
 *   - exportEquiposPdf: dedicated native jsPDF renderer for the Equipos
 *     grid — draws each team card (photo + stats) directly so the output
 *     is consistent regardless of the user's viewport width and doesn't
 *     depend on html2canvas being able to capture Next/Image elements.
 *
 * Both load their heavy dependencies with dynamic import() so the libraries
 * don't appear in the initial bundle. Only pages that actually export
 * something download them, and only on the first export.
 */

import {
  SITE_TITLE,
  PDF_MIME,
  formatDateTime,
  shareOrDownload,
  type Destination,
} from './export';
import type { jsPDF as JsPDF } from 'jspdf';
import type { CellDef, RowInput } from 'jspdf-autotable';

const GOLD = '#F5B800';
const GOLD_RGB: [number, number, number] = [245, 184, 0];
const TEXT_DARK: [number, number, number] = [22, 22, 22];
const TEXT_MUTED: [number, number, number] = [110, 110, 110];
const ROW_ALT: [number, number, number] = [245, 245, 245];
const HEADER_FILL: [number, number, number] = [24, 24, 28];
const HEADER_TEXT: [number, number, number] = [255, 255, 255];

export interface PdfColumn<T> {
  header: string;
  cell: (row: T) => string | number;
  align?: 'left' | 'center' | 'right';
  width?: number;
}

export interface ExportTablePdfOptions<T> {
  title?: string;
  subtitle?: string;
  filename: string;
  columns: PdfColumn<T>[];
  rows: T[];
  footer?: string;
  destination?: Destination;
}

export async function exportTablePdf<T>(
  opts: ExportTablePdfOptions<T>,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const wide = opts.columns.length > 6;
  const doc = new jsPDF({
    orientation: wide ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;

  const generatedAt = formatDateTime(new Date());
  const title = opts.title ?? SITE_TITLE;
  const subtitle = opts.subtitle;

  // Build the body once; autoTable expects a 2D array.
  const body = opts.rows.map((row) =>
    opts.columns.map((col) => {
      const raw = col.cell(row);
      return raw == null ? '' : String(raw);
    }),
  );

  // Map per-column alignment + width into autoTable's columnStyles.
  const columnStyles: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number }> = {};
  opts.columns.forEach((col, i) => {
    const entry: { halign?: 'left' | 'center' | 'right'; cellWidth?: number } = {};
    if (col.align) entry.halign = col.align;
    if (col.width != null) entry.cellWidth = col.width;
    if (Object.keys(entry).length > 0) columnStyles[i] = entry;
  });

  autoTable(doc, {
    head: [opts.columns.map((c) => c.header)],
    body,
    startY: subtitle ? 30 : 24,
    margin: { top: subtitle ? 30 : 24, bottom: 18, left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      textColor: TEXT_DARK,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: HEADER_FILL,
      textColor: HEADER_TEXT,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles,
    theme: 'grid',
    didDrawPage: () => {
      // Header: tournament title + subtitle + gold underline.
      doc.setTextColor(...TEXT_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, marginX, 13);

      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(subtitle, marginX, 19.5);
      }

      // Gold accent underline.
      doc.setDrawColor(...GOLD_RGB);
      doc.setLineWidth(0.7);
      doc.line(marginX, subtitle ? 22 : 16, pageW - marginX, subtitle ? 22 : 16);

      // Footer.
      const page = doc.getCurrentPageInfo().pageNumber;
      const total = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      const footerLeft = opts.footer ?? `Generado el ${generatedAt}`;
      doc.text(footerLeft, marginX, pageH - 8);
      const rightText = `Página ${page} de ${total}`;
      const rightW = doc.getTextWidth(rightText);
      doc.text(rightText, pageW - marginX - rightW, pageH - 8);
    },
  });

  const blob = doc.output('blob');
  await shareOrDownload(blob, `${opts.filename}.pdf`, PDF_MIME, opts.destination);
}

export interface JugadorPuntosPdfRow {
  nombre: string;
  /** Length 10 — points scored in each of the 10 fechas for 1-point shots. */
  p1: number[];
  sumaP1: number;
  /** Length 10 — 2-point shots. */
  p2: number[];
  sumaP2: number;
  /** Length 10 — 3-point shots. */
  p3: number[];
  sumaP3: number;
  subtotal: number;
}

export interface ExportPuntosJugadoresPdfOptions {
  title?: string;
  subtitle?: string;
  filename: string;
  /** Team name shown in the team-banner row above the table. */
  equipo: string;
  /** Hex color for the team banner accent. */
  equipoColor: string;
  /** Length 10 — short "DD/MM" date labels for F1..F10. Empty strings if unknown. */
  fechasDates: string[];
  jugadores: JugadorPuntosPdfRow[];
  destination?: Destination;
}

// Section band colors — mirror the web palette so the PDF reads like a
// light-mode version of the same screen.
const PJ_HDR_TEXT: RGB = [255, 255, 255];
const PJ_MUTED: RGB = [170, 170, 170];

const PJ_P1_HDR: RGB = [160, 120, 0];
const PJ_P1_BG:  RGB = [255, 244, 204];
const PJ_P1_TXT: RGB = [122, 92, 0];

const PJ_P2_HDR: RGB = [20, 70, 190];
const PJ_P2_BG:  RGB = [227, 237, 255];
const PJ_P2_TXT: RGB = [14, 63, 158];

const PJ_P3_HDR: RGB = [170, 15, 95];
const PJ_P3_BG:  RGB = [255, 228, 240];
const PJ_P3_TXT: RGB = [150, 0, 88];

const PJ_SUMA_HDR: RGB = [10, 130, 45];
const PJ_SUMA_BG:  RGB = [217, 245, 224];
const PJ_SUMA_TXT: RGB = [10, 90, 32];

const PJ_SUB_HDR: RGB = [160, 85, 0];
const PJ_SUB_BG:  RGB = [252, 232, 208];
const PJ_SUB_TXT: RGB = [122, 63, 0];

const PJ_NAME_HDR: RGB = [24, 24, 28];
const PJ_TOTAL_BG: RGB = [24, 24, 28];
const PJ_TOTAL_ACC: RGB = [255, 220, 80];

/**
 * Render the "Puntos de Jugadores" table for one team as a landscape A4 PDF
 * with the same colored section bands as the web (yellow/blue/pink/green/
 * orange) and a TOTAL row at the bottom. Uses jspdf-autotable so pagination
 * and page-wrapping Just Work if a team has more rows than fit.
 *
 * Note: the Greek Σ glyph isn't available in jsPDF's default Helvetica, so
 * the "Σ P1/P2/P3" column from the web becomes "TOT. P1/P2/P3" here.
 */
export async function exportPuntosJugadoresPdf(
  opts: ExportPuntosJugadoresPdfOptions,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();   // 297
  const pageH = doc.internal.pageSize.getHeight();  // 210
  const marginX = 8;

  const title = opts.title ?? SITE_TITLE;
  const subtitle = opts.subtitle;
  const generatedAt = formatDateTime(new Date());

  // --- Build header rows ---
  // Row 1: Jugador (rowSpan 2) + 3 colSpan-11 section labels + SUBTOTAL (rowSpan 2)
  const head1: CellDef[] = [
    {
      content: 'JUGADOR', rowSpan: 2,
      styles: { fillColor: PJ_NAME_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 9 },
    },
    {
      content: 'PUNTOS DE 1', colSpan: 11,
      styles: { fillColor: PJ_P1_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 9 },
    },
    {
      content: 'PUNTOS DE 2', colSpan: 11,
      styles: { fillColor: PJ_P2_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 9 },
    },
    {
      content: 'PUNTOS DE 3', colSpan: 11,
      styles: { fillColor: PJ_P3_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 9 },
    },
    {
      content: 'SUBTOTAL', rowSpan: 2,
      styles: { fillColor: PJ_SUB_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 8 },
    },
  ];

  // Row 2: F1..F10 + TOT. per section.
  const fechaCell = (section: 'P1' | 'P2' | 'P3', i: number): CellDef => {
    const fill = section === 'P1' ? PJ_P1_HDR : section === 'P2' ? PJ_P2_HDR : PJ_P3_HDR;
    const date = opts.fechasDates[i];
    return {
      content: date ? `F${i + 1}\n${date}` : `F${i + 1}`,
      styles: { fillColor: fill, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    };
  };
  const totCell = (): CellDef => ({
    content: 'TOT.',
    styles: { fillColor: PJ_SUMA_HDR, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
  });
  const head2: CellDef[] = [
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => fechaCell('P1', i)),
    totCell(),
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => fechaCell('P2', i)),
    totCell(),
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => fechaCell('P3', i)),
    totCell(),
  ];

  // --- Body rows: mirror web's "-" for empty cells and per-section text color ---
  const cellForValue = (v: number, bg: RGB, txt: RGB): CellDef => ({
    content: v > 0 ? String(v) : '-',
    styles: {
      fillColor: bg,
      textColor: v > 0 ? txt : PJ_MUTED,
      fontStyle: v > 0 ? 'bold' : 'normal',
      halign: 'center',
      fontSize: 8,
    },
  });

  const body: RowInput[] = opts.jugadores.map((j) => [
    {
      content: j.nombre,
      styles: { fontStyle: 'bold', halign: 'left', textColor: [22, 22, 22] as RGB, fontSize: 8.5 },
    } as CellDef,
    ...j.p1.map((v) => cellForValue(v, PJ_P1_BG, PJ_P1_TXT)),
    cellForValue(j.sumaP1, PJ_SUMA_BG, PJ_SUMA_TXT),
    ...j.p2.map((v) => cellForValue(v, PJ_P2_BG, PJ_P2_TXT)),
    cellForValue(j.sumaP2, PJ_SUMA_BG, PJ_SUMA_TXT),
    ...j.p3.map((v) => cellForValue(v, PJ_P3_BG, PJ_P3_TXT)),
    cellForValue(j.sumaP3, PJ_SUMA_BG, PJ_SUMA_TXT),
    cellForValue(j.subtotal, PJ_SUB_BG, PJ_SUB_TXT),
  ]);

  // --- Foot: TOTAL row ---
  const sumBy = (f: (j: JugadorPuntosPdfRow) => number) =>
    opts.jugadores.reduce((s, j) => s + f(j), 0);

  const totalCell = (val: number, bg: RGB): CellDef => ({
    content: val > 0 ? String(val) : '-',
    styles: { fillColor: bg, textColor: PJ_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
  });

  const foot: RowInput[] = [[
    {
      content: 'TOTAL',
      styles: { fillColor: PJ_TOTAL_BG, textColor: PJ_TOTAL_ACC, fontStyle: 'bold', halign: 'left', fontSize: 9 },
    } as CellDef,
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => totalCell(sumBy((j) => j.p1[i] || 0), PJ_P1_HDR)),
    totalCell(sumBy((j) => j.sumaP1), PJ_SUMA_HDR),
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => totalCell(sumBy((j) => j.p2[i] || 0), PJ_P2_HDR)),
    totalCell(sumBy((j) => j.sumaP2), PJ_SUMA_HDR),
    ...[0,1,2,3,4,5,6,7,8,9].map((i) => totalCell(sumBy((j) => j.p3[i] || 0), PJ_P3_HDR)),
    totalCell(sumBy((j) => j.sumaP3), PJ_SUMA_HDR),
    totalCell(sumBy((j) => j.subtotal), PJ_SUB_HDR),
  ]];

  // --- Column widths ---
  // Landscape A4 usable width = 297 - 16 = 281mm.
  // 1 name + 30 narrow + 3 TOT + 1 SUBTOTAL = 35 cols
  // name=32, narrow=6.6, tot=9, sub=11 → 32 + 30*6.6 + 3*9 + 11 = 32 + 198 + 27 + 11 = 268mm.
  const columnStyles: Record<number, { cellWidth: number }> = {};
  columnStyles[0] = { cellWidth: 32 };
  for (let i = 1; i <= 10; i++)  columnStyles[i]     = { cellWidth: 6.6 };
  columnStyles[11] = { cellWidth: 9 };
  for (let i = 12; i <= 21; i++) columnStyles[i]     = { cellWidth: 6.6 };
  columnStyles[22] = { cellWidth: 9 };
  for (let i = 23; i <= 32; i++) columnStyles[i]     = { cellWidth: 6.6 };
  columnStyles[33] = { cellWidth: 9 };
  columnStyles[34] = { cellWidth: 11 };

  autoTable(doc, {
    head: [head1, head2],
    body,
    foot,
    startY: subtitle ? 32 : 26,
    margin: { top: subtitle ? 32 : 26, bottom: 14, left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.2,
      lineColor: [220, 220, 220],
      lineWidth: 0.15,
      textColor: [22, 22, 22],
    },
    columnStyles,
    theme: 'grid',
    didDrawPage: () => {
      doc.setTextColor(...TEXT_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, marginX, 12);
      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(subtitle, marginX, 18);
      }
      doc.setDrawColor(...GOLD_RGB);
      doc.setLineWidth(0.7);
      doc.line(marginX, subtitle ? 21 : 15, pageW - marginX, subtitle ? 21 : 15);

      // Team banner under the underline.
      if (opts.equipo) {
        const [er, eg, eb] = hexToRgb(opts.equipoColor);
        const isWhiteish = er > 240 && eg > 240 && eb > 240;
        const [dr, dg, db]: RGB = isWhiteish ? [204, 204, 204] : [er, eg, eb];
        doc.setFillColor(dr, dg, db);
        doc.circle(marginX + 2, (subtitle ? 25 : 19) + 0.3, 1.3, 'F');
        doc.setTextColor(...TEXT_DARK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(opts.equipo, marginX + 5, subtitle ? 26 : 20);
      }

      // Footer.
      const page = doc.getCurrentPageInfo().pageNumber;
      const total = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Generado el ${generatedAt}`, marginX, pageH - 6);
      const rightText = `Página ${page} de ${total}`;
      const rightW = doc.getTextWidth(rightText);
      doc.text(rightText, pageW - marginX - rightW, pageH - 6);
    },
  });

  const blob = doc.output('blob');
  await shareOrDownload(blob, `${opts.filename}.pdf`, PDF_MIME, opts.destination);
}

export interface AsistenciaPdfRow {
  nombre: string;
  /** Length 10. '1' = presente, '0' = ausente, '' = sin datos. */
  fechas: string[];
  asistencia: string;
  totalFechas: string;
  fraccion: string;
  /** e.g. "71%" */
  porcentaje: string;
}

export interface ExportAsistenciasPdfOptions {
  title?: string;
  subtitle?: string;
  filename: string;
  equipo: string;
  equipoColor: string;
  /** Length 10 — short "DD/MM" date labels for F1..F10. Empty if unknown. */
  fechas: string[];
  /** Length 10 — true if that fecha already took place. */
  jugadas: boolean[];
  jugadores: AsistenciaPdfRow[];
  destination?: Destination;
}

const AS_HDR_BG: RGB = [24, 24, 28];
const AS_HDR_TEXT: RGB = [255, 255, 255];
const AS_CHECK: RGB = [10, 150, 50];
const AS_CROSS: RGB = [200, 30, 30];
const AS_PCT_HIGH: RGB = [10, 130, 45];
const AS_PCT_MID: RGB = [180, 130, 0];
const AS_PCT_LOW: RGB = [200, 30, 30];

/**
 * Render the "Asistencias" table for one team as a Letter landscape PDF.
 * Check and cross glyphs are drawn with line primitives (Helvetica doesn't
 * include the Unicode ✓ / ✗ characters), so they actually appear as shapes
 * instead of being replaced with punctuation. The % column is colored by
 * value to match the web.
 */
export async function exportAsistenciasPdf(
  opts: ExportAsistenciasPdfOptions,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 8;

  const title = opts.title ?? SITE_TITLE;
  const subtitle = opts.subtitle;
  const generatedAt = formatDateTime(new Date());

  // --- Header row: Jugador | 10 date columns | Asist | Fechas | Fracc. | % ---
  const dateHeaderCell = (i: number): CellDef => ({
    content: opts.fechas[i] || `F${i + 1}`,
    styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8 },
  });

  const head: CellDef[][] = [[
    {
      content: 'JUGADOR',
      styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 9 },
    },
    ...[0,1,2,3,4,5,6,7,8,9].map(dateHeaderCell),
    { content: 'ASIST.',  styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
    { content: 'FECHAS',  styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
    { content: 'FRACC.',  styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
    { content: '%',       styles: { fillColor: AS_HDR_BG, textColor: AS_HDR_TEXT, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
  ]];

  // Helper: pick the % column color by its numeric value.
  const pctColorFor = (pct: string): RGB => {
    const n = parseFloat(pct);
    if (isNaN(n)) return [22, 22, 22];
    if (n >= 80) return AS_PCT_HIGH;
    if (n >= 50) return AS_PCT_MID;
    return AS_PCT_LOW;
  };

  // --- Body ---
  // Attendance cells are passed with empty content; the check/cross shape is
  // drawn in didDrawCell using the original jugadores data.
  const body: RowInput[] = opts.jugadores.map((j) => [
    {
      content: j.nombre,
      styles: { fontStyle: 'bold', halign: 'left', textColor: [22, 22, 22] as RGB, fontSize: 9 },
    } as CellDef,
    ...j.fechas.map((): CellDef => ({ content: '', styles: { halign: 'center' } })),
    { content: j.asistencia,  styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } } as CellDef,
    { content: j.totalFechas, styles: { halign: 'center', fontSize: 9 } } as CellDef,
    { content: j.fraccion,    styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 } } as CellDef,
    {
      content: j.porcentaje,
      styles: { halign: 'center', fontStyle: 'bold', textColor: pctColorFor(j.porcentaje), fontSize: 9.5 },
    } as CellDef,
  ]);

  // --- Column widths ---
  // Letter landscape usable width ~263mm. Allocations: Jugador 50, 10 date
  // cols 13 each = 130, Asist/Fechas 14 each, Fracc/% 16 each. Total ≈ 240mm,
  // leaving a little slack for padding.
  const columnStyles: Record<number, { cellWidth: number }> = {};
  columnStyles[0] = { cellWidth: 50 };
  for (let i = 1; i <= 10; i++) columnStyles[i] = { cellWidth: 13 };
  columnStyles[11] = { cellWidth: 14 };
  columnStyles[12] = { cellWidth: 14 };
  columnStyles[13] = { cellWidth: 16 };
  columnStyles[14] = { cellWidth: 16 };

  autoTable(doc, {
    head,
    body,
    startY: subtitle ? 32 : 26,
    margin: { top: subtitle ? 32 : 26, bottom: 14, left: marginX, right: marginX },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [22, 22, 22],
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles,
    theme: 'grid',
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const col = data.column.index;
      if (col < 1 || col > 10) return;
      const rowIdx = data.row.index;
      const fechaIdx = col - 1;
      const player = opts.jugadores[rowIdx];
      if (!player) return;
      const played = opts.jugadas[fechaIdx];
      if (!played) return;
      const f = player.fechas[fechaIdx];
      const cell = data.cell;
      const cx = cell.x + cell.width / 2;
      const cy = cell.y + cell.height / 2;
      if (f === '1') {
        // Green check — two lines forming a V (longer right arm).
        doc.setDrawColor(...AS_CHECK);
        doc.setLineWidth(0.7);
        doc.line(cx - 2.2, cy + 0.2, cx - 0.4, cy + 2);
        doc.line(cx - 0.4, cy + 2, cx + 2.4, cy - 2);
      } else if (f === '0') {
        // Red cross — two diagonal lines.
        doc.setDrawColor(...AS_CROSS);
        doc.setLineWidth(0.7);
        doc.line(cx - 2, cy - 2, cx + 2, cy + 2);
        doc.line(cx - 2, cy + 2, cx + 2, cy - 2);
      }
    },
    didDrawPage: () => {
      doc.setTextColor(...TEXT_DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, marginX, 12);
      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(subtitle, marginX, 18);
      }
      doc.setDrawColor(...GOLD_RGB);
      doc.setLineWidth(0.7);
      doc.line(marginX, subtitle ? 21 : 15, pageW - marginX, subtitle ? 21 : 15);

      // Team banner under the underline.
      if (opts.equipo) {
        const [er, eg, eb] = hexToRgb(opts.equipoColor);
        const isWhiteish = er > 240 && eg > 240 && eb > 240;
        const [dr, dg, db]: RGB = isWhiteish ? [204, 204, 204] : [er, eg, eb];
        doc.setFillColor(dr, dg, db);
        doc.circle(marginX + 2, (subtitle ? 25 : 19) + 0.3, 1.3, 'F');
        doc.setTextColor(...TEXT_DARK);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(opts.equipo, marginX + 5, subtitle ? 26 : 20);
      }

      const page = doc.getCurrentPageInfo().pageNumber;
      const total = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(`Generado el ${generatedAt}`, marginX, pageH - 6);
      const rightText = `Página ${page} de ${total}`;
      const rightW = doc.getTextWidth(rightText);
      doc.text(rightText, pageW - marginX - rightW, pageH - 6);
    },
  });

  const blob = doc.output('blob');
  await shareOrDownload(blob, `${opts.filename}.pdf`, PDF_MIME, opts.destination);
}

// hexToRgb is defined later in the file (shared with exportEquiposPdf).

export interface EquipoPdfRow {
  nombre: string;
  /** Public URL of the team photo (e.g. /teams/miami-heat.jpg). */
  photoSrc: string | null;
  /** Hex colour string like #RRGGBB used for the accent dot. */
  color: string;
  puesto?: string;
  puntos?: number;
  pj?: number;
  pg?: number;
  pp?: number;
  puntosAnotados?: number;
  puntosRecibidos?: number;
  diferencia?: number;
  ppgOff?: string;
  ppgDef?: string;
  ratio?: string;
  winPct?: string;
  topScorer?: { nombre: string; puntos: number } | null;
}

export interface ExportEquiposPdfOptions {
  title?: string;
  subtitle?: string;
  filename: string;
  rows: EquipoPdfRow[];
  destination?: Destination;
}

type RGB = [number, number, number];

function hexToRgb(hex: string, fallback: RGB = [136, 136, 136]): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

interface LoadedPhoto {
  dataUrl: string;
  width: number;
  height: number;
}

async function fetchPhoto(src: string): Promise<LoadedPhoto | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('image load failed'));
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

/**
 * Render the Equipos page as a 3×2 grid of team cards drawn natively with
 * jsPDF on Letter landscape (6 teams per page). Photos are pre-fetched
 * with their intrinsic dimensions and drawn with aspect ratio preserved
 * (letterboxed within their box) so they never look stretched.
 *
 * The card design mirrors the web screen: photo on top, team name +
 * "Cúcuta" subtitle, PUESTO pill, PUNTOS, PJ/PG/PP row, P.ANO/P.REC/DIF
 * row, 2×2 stat-box grid (Prom. Pts, Prom. Pts Rec., Ratio, % Vict.),
 * and a máx. anotador footer.
 */
export async function exportEquiposPdf(
  opts: ExportEquiposPdfOptions,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');

  // Pre-load every photo as a data URL in parallel, along with its
  // intrinsic dimensions so we can preserve aspect ratio when drawing.
  const photos = await Promise.all(
    opts.rows.map((r) => (r.photoSrc ? fetchPhoto(r.photoSrc) : Promise.resolve(null))),
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();   // 279.4
  const pageH = doc.internal.pageSize.getHeight();  // 215.9
  const marginX = 10;
  const topY = 24;
  const botY = 12;
  const usableW = pageW - marginX * 2;
  const usableH = pageH - topY - botY;

  const cols = 3;
  const rowsPerPage = 2;
  const gapX = 6;
  const gapY = 6;
  const cardW = (usableW - gapX * (cols - 1)) / cols;
  const cardH = (usableH - gapY * (rowsPerPage - 1)) / rowsPerPage;

  const title = opts.title ?? SITE_TITLE;
  const subtitle = opts.subtitle;
  const generatedAt = formatDateTime(new Date());

  const drawChrome = (pageNum: number, totalPages: number) => {
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, marginX, 13);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(subtitle, marginX, 19.5);
    }
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.7);
    doc.line(marginX, subtitle ? 22 : 16, pageW - marginX, subtitle ? 22 : 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Generado el ${generatedAt}`, marginX, pageH - 5);
    const rightText = `Página ${pageNum} de ${totalPages}`;
    const rightW = doc.getTextWidth(rightText);
    doc.text(rightText, pageW - marginX - rightW, pageH - 5);
  };

  const perPage = cols * rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(opts.rows.length / perPage));

  for (let i = 0; i < opts.rows.length; i++) {
    const posInPage = i % perPage;
    if (i > 0 && posInPage === 0) doc.addPage();

    const col = posInPage % cols;
    const row = Math.floor(posInPage / cols);
    const x = marginX + col * (cardW + gapX);
    const y = topY + row * (cardH + gapY);

    drawTeamCard(doc, x, y, cardW, cardH, opts.rows[i], photos[i]);
  }

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawChrome(p, totalPages);
  }

  const blob = doc.output('blob');
  await shareOrDownload(blob, `${opts.filename}.pdf`, PDF_MIME, opts.destination);
}

function drawTeamCard(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  team: EquipoPdfRow,
  photo: LoadedPhoto | null,
) {
  // Card background + border.
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(225, 225, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');

  // --- Photo (top ~40% of card, aspect ratio preserved) ---
  // The box is full card width, but the image itself is letterboxed so it
  // never stretches. Background fill shows through on the sides when the
  // source is narrower than the box.
  const photoBoxH = h * 0.40;
  doc.setFillColor(238, 238, 238);
  doc.rect(x, y, w, photoBoxH, 'F');
  if (photo) {
    const srcAspect = photo.width / photo.height;
    const boxAspect = w / photoBoxH;
    let drawW: number;
    let drawH: number;
    if (srcAspect > boxAspect) {
      drawW = w;
      drawH = w / srcAspect;
    } else {
      drawH = photoBoxH;
      drawW = photoBoxH * srcAspect;
    }
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (photoBoxH - drawH) / 2;
    try {
      doc.addImage(photo.dataUrl, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
    } catch {
      // leave the gray placeholder in place
    }
  }

  // Thin color bar just under the photo for team accent.
  const [dr, dg, db] = hexToRgb(team.color);
  const isWhiteish = dr > 240 && dg > 240 && db > 240;
  const accent: RGB = isWhiteish ? [204, 204, 204] : [dr, dg, db];
  doc.setFillColor(...accent);
  doc.rect(x, y + photoBoxH, w, 0.8, 'F');

  // --- Name row: color dot + team name + "Cúcuta" subtitle ---
  const nameTopY = y + photoBoxH + 3.5;
  doc.setFillColor(...accent);
  doc.roundedRect(x + 3, nameTopY, 1, 4.2, 0.3, 0.3, 'F');

  doc.setTextColor(...TEXT_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(team.nombre, x + 5.5, nameTopY + 2.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Cúcuta', x + 5.5, nameTopY + 6);

  // --- Stats area begins below the name block ---
  const statsStartY = nameTopY + 8.5;
  const statsEndY = y + h - 2;
  const statsH = statsEndY - statsStartY;

  // Row vertical budget (weights sum to 100, so heights scale with statsH).
  const R = statsH / 100;
  const heights = {
    puesto:     12 * R,
    puntos:     12 * R,
    pjpgpp:     15 * R,
    panoRecDif: 15 * R,
    promBoxes:  31 * R,
    maxScorer:  15 * R,
  };

  const drawSeparator = (atY: number) => {
    doc.setDrawColor(228, 228, 228);
    doc.setLineWidth(0.2);
    doc.line(x + 3, atY, x + w - 3, atY);
  };

  let curY = statsStartY;

  // PUESTO row — label on the left, gold pill on the right.
  drawSeparator(curY);
  {
    const midBaseline = curY + heights.puesto / 2 + 1.3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('PUESTO', x + 4, midBaseline);
    if (team.puesto) {
      const puestoText = `${team.puesto}°`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      const tw = doc.getTextWidth(puestoText);
      const pillW = tw + 4;
      const pillH = Math.min(heights.puesto - 1.5, 4.5);
      const pillX = x + w - pillW - 3;
      const pillY = curY + (heights.puesto - pillH) / 2;
      doc.setFillColor(...GOLD_RGB);
      doc.roundedRect(pillX, pillY, pillW, pillH, 1, 1, 'F');
      doc.setTextColor(22, 22, 22);
      doc.text(puestoText, pillX + pillW / 2, pillY + pillH - 1.2, { align: 'center' });
    }
  }
  curY += heights.puesto;

  // PUNTOS row — label on the left, gold value on the right.
  drawSeparator(curY);
  {
    const midBaseline = curY + heights.puntos / 2 + 1.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('PUNTOS', x + 4, midBaseline);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GOLD_RGB);
    doc.text(String(team.puntos ?? '—'), x + w - 4, midBaseline, { align: 'right' });
  }
  curY += heights.puntos;

  // PJ / PG / PP three-column row.
  drawSeparator(curY);
  drawThreeStat(doc, x, curY, w, heights.pjpgpp, [
    { label: 'PJ', value: String(team.pj ?? '—'), color: TEXT_DARK },
    { label: 'PG', value: String(team.pg ?? '—'), color: [34, 197, 94] },
    { label: 'PP', value: String(team.pp ?? '—'), color: [220, 38, 38] },
  ]);
  curY += heights.pjpgpp;

  // P.ANO / P.REC / DIF three-column row.
  drawSeparator(curY);
  const dif = team.diferencia;
  const difText = dif == null ? '—' : `${dif > 0 ? '+' : ''}${dif}`;
  const difColor: RGB = dif == null ? TEXT_DARK : dif >= 0 ? [34, 197, 94] : [220, 38, 38];
  drawThreeStat(doc, x, curY, w, heights.panoRecDif, [
    { label: 'P. ANO.', value: String(team.puntosAnotados ?? '—'), color: TEXT_DARK },
    { label: 'P. REC.', value: String(team.puntosRecibidos ?? '—'), color: TEXT_DARK },
    { label: 'DIF.',    value: difText, color: difColor },
  ]);
  curY += heights.panoRecDif;

  // 2×2 grid of stat boxes (Prom. Pts, Prom. Pts Rec., Ratio, % Victorias).
  drawSeparator(curY);
  drawStatBoxGrid(doc, x + 3, curY + 1.3, w - 6, heights.promBoxes - 2, [
    { label: 'PROM. PTS/PART.',      value: team.ppgOff ?? '—',     color: [34, 197, 94] },
    { label: 'PROM. PTS REC./PART.', value: team.ppgDef ?? '—',     color: [220, 38, 38] },
    { label: 'RATIO PF/PC',          value: team.ratio ?? '—',      color: [245, 184, 0] },
    { label: '% VICTORIAS',          value: team.winPct ? `${team.winPct}%` : '—', color: TEXT_DARK },
  ]);
  curY += heights.promBoxes;

  // Máx. anotador row — label + name on the left, "<pts> pts" on the right.
  drawSeparator(curY);
  {
    const labelBaseline = curY + heights.maxScorer * 0.38;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('MÁX. ANOTADOR', x + 4, labelBaseline);

    const nameBaseline = curY + heights.maxScorer * 0.88;
    const scorerName = team.topScorer?.nombre ?? '—';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_DARK);
    // If there's a points value, reserve space on the right so the name
    // doesn't collide with it.
    const rightReserve = team.topScorer ? 16 : 4;
    const nameMaxW = w - rightReserve - 6;
    const nameLines = doc.splitTextToSize(scorerName, nameMaxW) as string[];
    doc.text(nameLines[0] ?? scorerName, x + 4, nameBaseline);

    if (team.topScorer) {
      const rightX = x + w - 4;
      doc.setFontSize(9.5);
      doc.setTextColor(...GOLD_RGB);
      doc.text(String(team.topScorer.puntos), rightX, nameBaseline - 1.5, { align: 'right' });
      doc.setFontSize(5.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text('pts', rightX, nameBaseline + 1.8, { align: 'right' });
    }
  }
}

function drawStatBoxGrid(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  cells: Array<{ label: string; value: string; color: RGB }>,
) {
  // 2×2 grid; each box has a light-gray fill, label on top, value bold below.
  const gap = 1.5;
  const bw = (w - gap) / 2;
  const bh = (h - gap) / 2;
  cells.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = x + col * (bw + gap);
    const by = y + row * (bh + gap);
    doc.setFillColor(243, 243, 243);
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.15);
    doc.roundedRect(bx, by, bw, bh, 1, 1, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(c.label, bx + bw / 2, by + bh * 0.38, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...c.color);
    doc.text(c.value, bx + bw / 2, by + bh * 0.88, { align: 'center' });
  });
}

function drawThreeStat(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  rowH: number,
  cells: Array<{ label: string; value: string; color: RGB }>,
) {
  // Label near the top of the row, value bold near the bottom. Keep the
  // label + value at small sizes so they don't collide when rowH is tight.
  const n = cells.length;
  const labelBaseline = y + rowH * 0.40;
  const valueBaseline = y + rowH * 0.92;
  for (let i = 0; i < n; i++) {
    const cx = x + (w / n) * (i + 0.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(cells[i].label, cx, labelBaseline, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...cells[i].color);
    doc.text(cells[i].value, cx, valueBaseline, { align: 'center' });
  }
}

export interface ExportVisualPdfOptions {
  title?: string;
  subtitle?: string;
  filename: string;
  /** Element id of the DOM container to capture. */
  elementId: string;
  /** Optional background color to force during capture (defaults to white). */
  backgroundColor?: string;
  destination?: Destination;
}

/**
 * Render a DOM element to PDF via html2canvas, scaling it to fit A4.
 * Multi-page output is supported: if the capture is taller than one page,
 * the same image is sliced across successive pages.
 */
export async function exportVisualPdf(
  opts: ExportVisualPdfOptions,
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas-pro');

  const el = document.getElementById(opts.elementId);
  if (!el) {
    throw new Error(`No se encontró el elemento con id="${opts.elementId}"`);
  }

  // Capture at 2x for crisp text, force a white background so dark-mode
  // pages still render legibly in the PDF.
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: opts.backgroundColor ?? '#ffffff',
    useCORS: true,
    logging: false,
  });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const headerH = 24;
  const footerH = 10;
  const usableW = pageW - marginX * 2;
  const usableH = pageH - headerH - footerH;

  // Fit the canvas width into the usable width; compute pixel equivalent
  // of one usable page's worth of height so we can slice.
  const ratio = usableW / canvas.width;
  const imgH = canvas.height * ratio;
  const pageCanvasH = usableH / ratio; // how many px of source per page

  const title = opts.title ?? SITE_TITLE;
  const subtitle = opts.subtitle;
  const generatedAt = formatDateTime(new Date());

  const drawChrome = (pageNum: number, totalPages: number) => {
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, marginX, 13);
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(subtitle, marginX, 19.5);
    }
    doc.setDrawColor(...GOLD_RGB);
    doc.setLineWidth(0.7);
    doc.line(marginX, subtitle ? 22 : 16, pageW - marginX, subtitle ? 22 : 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Generado el ${generatedAt}`, marginX, pageH - 4);
    const rightText = `Página ${pageNum} de ${totalPages}`;
    const rightW = doc.getTextWidth(rightText);
    doc.text(rightText, pageW - marginX - rightW, pageH - 4);
  };

  const totalPages = Math.max(1, Math.ceil(imgH / usableH));

  // For each slice, build a sub-canvas and add it as an image so we don't
  // rely on jsPDF's imprecise "position offset" trick (which can leave
  // visible seams between pages).
  for (let i = 0; i < totalPages; i++) {
    if (i > 0) doc.addPage();

    const sliceCanvas = document.createElement('canvas');
    const srcY = i * pageCanvasH;
    const srcH = Math.min(pageCanvasH, canvas.height - srcY);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.max(1, Math.round(srcH));
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = opts.backgroundColor ?? '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, srcY, canvas.width, srcH,
        0, 0, canvas.width, srcH,
      );
    }
    const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.92);
    const drawH = srcH * ratio;
    doc.addImage(dataUrl, 'JPEG', marginX, headerH, usableW, drawH);
    drawChrome(i + 1, totalPages);
  }

  // Fallback for older jsPDF versions where pages drawn before the last call
  // lose their chrome — re-stamp just in case.
  void GOLD;

  const blob = doc.output('blob');
  await shareOrDownload(blob, `${opts.filename}.pdf`, PDF_MIME, opts.destination);
}
