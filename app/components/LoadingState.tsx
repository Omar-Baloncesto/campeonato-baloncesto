interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton';
  rows?: number;
}

export default function LoadingState({ message = 'Cargando...', variant = 'spinner', rows = 5 }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className="animate-fade-in" role="status" aria-busy="true" aria-label={message}>
        <div className="bg-bg-secondary rounded-xl overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-bg-header px-5 py-3">
            <div className="skeleton h-4 w-3/4" />
          </div>
          {/* Row skeletons */}
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle"
            >
              <div className="skeleton h-4 w-8 shrink-0" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-12 shrink-0" />
              <div className="skeleton h-4 w-12 shrink-0" />
            </div>
          ))}
        </div>
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in"
      role="status"
      aria-busy="true"
    >
      <div className="spinner" />
      <span className="text-text-muted text-sm tracking-wider uppercase">
        {message}
      </span>
    </div>
  );
}
