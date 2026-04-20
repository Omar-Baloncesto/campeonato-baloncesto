/**
 * PDF export helpers built on top of jsPDF + jspdf-autotable.
 *
 * Two flavours:
 *   - exportTablePdf: for pages whose content is naturally a table
 *     (posiciones, fixture, stats, etc.).
 *   - exportVisualPdf: for pages whose layout is rich/non-tabular and
 *     should be captured from the DOM with html2canvas (Equipos, Bracket).
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
