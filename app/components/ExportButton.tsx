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

export interface ExportButtonProps {
  /** Disables the whole control while data is still loading. */
  disabled?: boolean;
  /** If omitted, the PDF option isn't shown. */
  onExportPdf?: () => void | Promise<void>;
  /** If omitted, the Excel option isn't shown. */
  onExportExcel?: () => void | Promise<void>;
  /** Optional label override (defaults to "Exportar"). */
  label?: string;
}

type FormatKey = 'pdf' | 'excel';

/**
 * Small "Exportar" button shown in each page's header area.
 *
 * Behaviour:
 *   - If both PDF + Excel handlers are provided, the button opens a
 *     dropdown menu with both options.
 *   - If only the PDF handler is provided (e.g. Equipos page), the
 *     button exports directly on click — no menu is shown.
 *   - Keyboard: Escape closes, Arrow keys navigate, Enter activates,
 *     Tab leaves. Click-outside closes. Focus returns to the trigger
 *     after selection or Escape.
 *   - Uses the existing ToastProvider to announce progress and errors.
 *   - Shows a spinner while the export runs and disables both options.
 */
export default function ExportButton({
  disabled = false,
  onExportPdf,
  onExportExcel,
  label = 'Exportar',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<FormatKey | null>(null);
  const { showToast } = useToast();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const hasPdf = typeof onExportPdf === 'function';
  const hasExcel = typeof onExportExcel === 'function';
  const hasMenu = hasPdf && hasExcel;

  const runExport = useCallback(
    async (kind: FormatKey) => {
      const handler = kind === 'pdf' ? onExportPdf : onExportExcel;
      if (!handler) return;
      setBusy(kind);
      setOpen(false);
      const niceName = kind === 'pdf' ? 'PDF' : 'Excel';
      showToast(`Generando ${niceName}…`, 'info');
      try {
        await handler();
        showToast('Listo', 'success');
      } catch (err) {
        console.error(`Export ${kind} failed:`, err);
        showToast(`Error al generar ${niceName}`, 'error');
      } finally {
        setBusy(null);
        // Restore focus to trigger so keyboard users don't lose context.
        triggerRef.current?.focus();
      }
    },
    [onExportPdf, onExportExcel, showToast],
  );

  // Close the menu when the user clicks anywhere outside of it.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (root && e.target instanceof Node && !root.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When the menu opens, focus the first enabled item.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])',
    );
    first?.focus();
  }, [open]);

  if (!hasPdf && !hasExcel) {
    // Nothing to export — render nothing rather than an inert button.
    return null;
  }

  const handleTriggerClick = () => {
    if (disabled || busy) return;
    if (!hasMenu) {
      // Single-handler mode: export directly.
      if (hasPdf) void runExport('pdf');
      else if (hasExcel) void runExport('excel');
      return;
    }
    setOpen((v) => !v);
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
      // Let the user tab out, which should close the menu.
      setOpen(false);
    }
  };

  // Label shown when in single-handler mode — more descriptive than
  // the generic "Exportar".
  const triggerLabel = hasMenu
    ? label
    : hasPdf
      ? 'PDF'
      : 'Excel';

  const isBusy = busy !== null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled || isBusy}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-expanded={hasMenu ? open : undefined}
        aria-controls={hasMenu ? menuId : undefined}
        aria-label={
          hasMenu ? `${label} datos de la página` : `Exportar como ${triggerLabel}`
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
        {hasMenu && !isBusy && (
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {hasMenu && open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Formato de exportación"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-2 min-w-[160px] rounded-xl border border-border-light bg-bg-card backdrop-blur-xl shadow-xl z-50 overflow-hidden"
        >
          {hasPdf && (
            <MenuItem
              label="PDF"
              hint="Documento"
              disabled={isBusy}
              onSelect={() => runExport('pdf')}
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
              onSelect={() => runExport('excel')}
              icon={
                <svg className="w-4 h-4 text-positive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path strokeLinecap="round" d="M8 8l8 8M16 8l-8 8" />
                </svg>
              }
            />
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
