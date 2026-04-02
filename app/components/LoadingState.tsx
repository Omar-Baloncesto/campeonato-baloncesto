interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton';
  rows?: number;
}

export default function LoadingState({ message = 'Cargando...', variant = 'spinner', rows = 5 }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="animate-fade-in" role="status" aria-busy="true" aria-label={message}>
        <div className="bg-bg-secondary rounded-xl overflow-hidden border border-border-light">
          {/* Header skeleton */}
          <div className="bg-bg-header px-5 py-3.5 flex gap-6">
            <div className="skeleton h-3.5 w-10" />
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton h-3.5 w-12 ml-auto" />
            <div className="skeleton h-3.5 w-12" />
            <div className="skeleton h-3.5 w-12" />
          </div>
          {/* Row skeletons */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-border-subtle"
              style={{ opacity: 1 - (i * 0.12) }}
            >
              <div className="skeleton h-4 w-6 shrink-0" />
              <div className="skeleton h-3 w-3 rounded-full shrink-0" />
              <div className="skeleton h-4 flex-1 max-w-[180px]" />
              <div className="skeleton h-4 w-10 shrink-0 ml-auto" />
              <div className="skeleton h-4 w-10 shrink-0" />
              <div className="skeleton h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-5 animate-fade-in"
      role="status"
      aria-busy="true"
    >
      <div className="relative">
        <div className="spinner" />
        <div className="absolute inset-0 rounded-full bg-gold/5 animate-ping" style={{ animationDuration: '1.5s' }} />
      </div>
      <span className="text-text-muted text-sm tracking-wider uppercase">
        {message}
      </span>
    </div>
  );
}

export function ErrorState({ message = 'No se pudieron cargar los datos', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
      <div className="text-4xl bounce">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
      </div>
      <p className="text-text-muted text-sm text-center max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-gold/10 text-gold text-sm font-medium border border-gold/20 hover:bg-gold/20 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
