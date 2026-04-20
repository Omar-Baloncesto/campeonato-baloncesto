/**
 * Shared helpers for the Exportar feature. These are tiny, dependency-free
 * utilities that the PDF and Excel modules build on top of. Keeping the heavy
 * libraries out of this file means it stays in the initial bundle with a
 * negligible cost; jsPDF, xlsx, etc. are loaded lazily inside the export
 * functions themselves.
 */

export const SITE_TITLE = 'Campeonato Baloncesto · Cúcuta 2026';

/** Where the generated file should end up. */
export type Destination = 'download' | 'whatsapp' | 'share';

/** Strip accents, collapse whitespace, and lower-case for filename safety. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a file name like `posiciones-2026-04-20` (no extension). The page
 * argument is slugified, and the date is the user's local day, not UTC —
 * filenames should match what the user sees on screen.
 */
export function buildFilename(page: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const slug = slugify(page) || 'export';
  return `${slug}-${y}-${m}-${d}`;
}

/** DD/MM/YYYY formatted for the current locale (but without named months). */
export function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY HH:mm — used in PDF footers. */
export function formatDateTime(date: Date): string {
  const d = formatDate(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${hh}:${mm}`;
}

/**
 * UA-based mobile detection. Used by the ExportButton to decide whether to
 * show the desktop "Descargar / WhatsApp" destination picker or jump straight
 * to the native share sheet. Intentionally conservative — iPads that report
 * as "Macintosh" will be treated as desktop.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke on next tick so some browsers (Safari) have time to start the
    // download before we invalidate the URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Dispatch the generated file to the destination the user picked.
 *
 * - `share`  → Web Share API (native share sheet, used on mobile).
 * - `download` → classic download to the browser's Descargas folder.
 * - `whatsapp` → download the file AND open WhatsApp Web in a new tab
 *   with a helpful hint toast. WhatsApp Web has no API for attaching files
 *   programmatically, so the user drags the just-downloaded file into the
 *   chat; the flow is still one less decision than "download, find the file,
 *   manually open WhatsApp".
 *
 * If `share` is requested but the UA can't actually share THIS file (e.g.
 * desktop browsers without file-level Web Share), we fall back to download.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string,
  destination: Destination = 'download',
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (destination === 'share') {
    const file = new File([blob], filename, { type: mimeType });
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: SITE_TITLE,
          text: SITE_TITLE,
        });
        return;
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name === 'AbortError') return; // user dismissed, no fallback
        // Any other error → fall through to download below.
      }
    }
    // Fallback: no Web Share support for this file — just download it.
    triggerDownload(blob, filename);
    return;
  }

  if (destination === 'whatsapp') {
    // Always download the file first — WhatsApp Web can't accept files
    // via URL parameters, so the user drags it into the chat manually.
    triggerDownload(blob, filename);
    // Open WhatsApp Web in a new tab so the user already sees it.
    try {
      window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    } catch {
      // Pop-up blockers etc. — silently ignore, the file was still
      // downloaded so the user can open WhatsApp Web themselves.
    }
    return;
  }

  // Default: plain download.
  triggerDownload(blob, filename);
}

export const PDF_MIME = 'application/pdf';
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
