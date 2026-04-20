'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useToast } from './ToastProvider';
import { isMobileDevice, type Destination } from '../lib/export';

export interface ExportButtonProps {
  /** Disables the whole control while data is still loading. */
  disabled?: boolean;
  /** If omitted, the PDF option isn't shown. */
  onExportPdf?: (destination: Destination) => void | Promise<void>;
  /** If omitted, the Excel option isn't shown. */
  onExportExcel?: (destination: Destination) => void | Promise<void>;
  /** Optional label override (defaults to "Exportar"). */
  label?: string;
}

type FormatKey = 'pdf' | 'excel';
type Phase = 'closed' | 'format' | 'destination';

/**
 * Export trigger shown in each page header.
 *
 * Flow (mobile): one tap → format menu → pick PDF/Excel → file is built
 * and the native share sheet opens (WhatsApp, Mail, Drive, etc. appear
 * as the OS normally offers).
 *
 * Flow (desktop): two taps → format menu → pick PDF/Excel → destination
 * menu → pick Descargar or WhatsApp Web. Descargar saves to the browser's
 * Descargas folder; WhatsApp Web downloads the file and opens
 * web.whatsapp.com in a new tab so the user can drag the file into a chat.
 *
 * For pages with only one format (Equipos = PDF), the format step is
 * skipped on desktop: the trigger opens the destination menu directly.
 */
export default function ExportButton({
  disabled = false,
  onExportPdf,
  onExportExcel,
  label = 'Exportar',
}: ExportButtonProps) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [pickedFormat, setPickedFormat] = useState<FormatKey | null>(null);
  const [busy, setBusy] = useState<FormatKey | null>(null);
  const [mobile, setMobile] = useState(false);
  const { showToast } = useToast();

  // Re-evaluate the UA on mount so SSR renders desktop UI consistently and
  // the client swaps to mobile flow if appropriate.
  useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const hasPdf = typeof onExportPdf === 'function';
  const hasExcel = typeof onExportExcel === 'function';
  const hasBothFormats = hasPdf && hasExcel;

  const runExport = useCallback(
    async (kind: FormatKey, destination: Destination) => {
      const handler = kind === 'pdf' ? onExportPdf : onExportExcel;
      if (!handler) return;
      setBusy(kind);
      setPhase('closed');
      setPickedFormat(null);
      const niceName = kind === 'pdf' ? 'PDF' : 'Excel';
      showToast(`Generando ${niceName}…`, 'info');
      try {
        await handler(destination);
        if (destination === 'whatsapp') {
          showToast('Archivo listo — arrástralo al chat de WhatsApp', 'success');
        } else {
          showToast('Listo', 'success');
        }
      } catch (err) {
        console.error(`Export ${kind} failed:`, err);
        showToast(`Error al generar ${niceName}`, 'error');
      } finally {
        setBusy(null);
        triggerRef.current?.focus();
      }
    },
    [onExportPdf, onExportExcel, showToast],
  );

  // On mobile, picking a format triggers export directly via Web Share.
  // On desktop, picking a format advances to the destination step.
  const selectFormat = useCallback(
    (kind: FormatKey) => {
      if (mobile) {
        void runExport(kind, 'share');
        return;
      }
      setPickedFormat(kind);
      setPhase('destination');
    },
    [mobile, runExport],
  );

  const selectDestination = useCallback(
    (dest: Destination) => {
      if (!pickedFormat) return;
      void runExport(pickedFormat, dest);
    },
    [pickedFormat, runExport],
  );

  // Close the menu when the user clicks anywhere outside of it.
  useEffect(() => {
    if (phase === 'closed') return;
    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        setPhase('closed');
        setPickedFormat(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'destination') {
          setPhase('format');
          setPickedFormat(null);
        } else {
          setPhase('closed');
        }
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [phase]);

  // When the menu opens, focus the first enabled item.
  useEffect(() => {
    if (phase === 'closed') return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    first?.focus();
  }, [phase]);

  if (!hasPdf && !hasExcel) {
    return null;
  }

  const handleTriggerClick = () => {
    if (disabled || busy) return;
    if (phase !== 'closed') {
      setPhase('closed');
      setPickedFormat(null);
      return;
    }
    // Single format + desktop → jump straight to destination picker.
    if (!hasBothFormats && !mobile) {
      const only: FormatKey = hasPdf ? 'pdf' : 'excel';
      setPickedFormat(only);
      setPhase('destination');
      return;
    }
    // Single format + mobile → one-tap export via native share.
    if (!hasBothFormats && mobile) {
      const only: FormatKey = hasPdf ? 'pdf' : 'excel';
      void runExport(only, 'share');
      return;
    }
    // Two formats → start with the format picker.
    setPhase('format');
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.findIndex((el) => el === active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setPhase('closed');
      setPickedFormat(null);
    }
  };

  const triggerLabel = hasBothFormats ? label : hasPdf ? 'PDF' : 'Excel';
  const isBusy = busy !== null;
  const open = phase !== 'closed';

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled || isBusy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={
          hasBothFormats ? `${label} datos de la página` : `Exportar como ${triggerLabel}`
        }
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
          text-[11px] font-semibold uppercase tracking-wider
          border transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open
            ? 'bg-gold/20 text-gold border-gold/50'
            : 'bg-bg-secondary text-text-muted border-border-light hover:text-gold hover:border-gold/40'
          }
        `}
      >
        {isBusy ? (
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        )}
        <span>{isBusy ? 'Generando…' : triggerLabel}</span>
        {!isBusy && (
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={phase === 'destination' ? 'Destino del archivo' : 'Formato de exportación'}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-2 min-w-[220px] rounded-xl border border-border-light bg-bg-card backdrop-blur-xl shadow-xl z-50 overflow-hidden"
        >
          {phase === 'format' && (
            <>
              {hasPdf && (
                <MenuItem
                  label="PDF"
                  hint="Documento"
                  disabled={isBusy}
                  onSelect={() => selectFormat('pdf')}
                  icon={
                    <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
                    </svg>
                  }
                />
              )}
              {hasExcel && (
                <MenuItem
                  label="Excel"
                  hint="Hoja de cálculo"
                  disabled={isBusy}
                  onSelect={() => selectFormat('excel')}
                  icon={
                    <svg className="w-4 h-4 text-positive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path strokeLinecap="round" d="M8 8l8 8M16 8l-8 8" />
                    </svg>
                  }
                />
              )}
            </>
          )}

          {phase === 'destination' && (
            <>
              <div className="px-3.5 py-2 text-[10px] text-text-muted uppercase tracking-wider border-b border-border-subtle">
                {pickedFormat === 'pdf' ? 'PDF' : 'Excel'} · ¿a dónde?
              </div>
              <MenuItem
                label="Descargar"
                hint="A Descargas del PC"
                disabled={isBusy}
                onSelect={() => selectDestination('download')}
                icon={
                  <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                }
              />
              <MenuItem
                label="WhatsApp Web"
                hint="Abre el chat y arrastras el archivo"
                disabled={isBusy}
                onSelect={() => selectDestination('whatsapp')}
                icon={
                  <svg className="w-4 h-4 text-positive" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.588-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.99 5.945L2.44 19.94l3.213-1.747zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                  </svg>
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  hint,
  icon,
  disabled,
  onSelect,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className="
        w-full flex items-center gap-3 px-3.5 py-2.5 text-left
        text-sm text-text-primary
        hover:bg-white/[0.05] focus:bg-white/[0.07] focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-100
      "
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold leading-tight">{label}</span>
        {hint && (
          <span className="block text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
