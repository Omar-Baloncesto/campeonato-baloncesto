/**
 * Shared helpers for the Exportar feature. These are tiny, dependency-free
 * utilities that the PDF and Excel modules build on top of. Keeping the heavy
 * libraries out of this file means it stays in the initial bundle with a
 * negligible cost; jsPDF, xlsx, etc. are loaded lazily inside the export
 * functions themselves.
 */

export const SITE_TITLE = 'Campeonato Baloncesto · Cúcuta 2026';

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
 * Share the generated file via the Web Share API when the device supports
 * file-level sharing (modern iOS Safari, Chrome Android, some desktops).
 * Falls back to a traditional download for everything else.
 *
 * We intentionally do not target WhatsApp directly — letting the OS show the
 * native share sheet is both safer and lets the user pick any destination
 * (Telegram, Mail, Drive, AirDrop, etc.).
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Build the File once; Web Share needs a File, download works with Blob.
  const file = new File([blob], filename, { type: mimeType });

  // Try the Web Share API only if the UA reports it can share THIS file.
  // Some browsers expose canShare() but can't handle files; the check with
  // `{ files }` guards against that false positive.
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
      // AbortError = user dismissed the share sheet. Do nothing (don't
      // fall back to download, they made a choice). Any other error, we
      // fall through to the download path below.
      const name = (err as { name?: string })?.name;
      if (name === 'AbortError') return;
    }
  }

  // Desktop / unsupported mobile browsers: classic download.
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

export const PDF_MIME = 'application/pdf';
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
