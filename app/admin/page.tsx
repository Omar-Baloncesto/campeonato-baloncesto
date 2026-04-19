'use client';

import { useState } from 'react';

interface DayCount {
  date: string;
  count: number;
}

interface VisitStats {
  today: number;
  total: number;
  days: DayCount[];
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (t: string) => {
    const r = await fetch('/api/visits', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!r.ok) {
      setToken(null);
      setStats(null);
      setError('Sesión inválida. Vuelve a ingresar la clave.');
      return;
    }
    const data = await r.json() as { success: boolean } & VisitStats;
    if (data.success) {
      setStats({ today: data.today, total: data.total, days: data.days });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({})) as { error?: string };
        setError(
          data.error === 'admin_password_not_configured'
            ? 'ADMIN_PASSWORD no está configurado en el servidor.'
            : 'Contraseña incorrecta.',
        );
        return;
      }
      const data = await r.json() as { token: string };
      setPassword('');
      setToken(data.token);
      await loadStats(data.token);
    } catch {
      setError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const onLogout = () => {
    setToken(null);
    setStats(null);
    setPassword('');
  };

  if (!token || !stats) {
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto">
        <div className="glass-card rounded-xl p-6">
          <h1 className="text-lg font-semibold mb-1">Panel privado</h1>
          <p className="text-[12px] text-text-muted mb-5">
            Ingresa la contraseña de administrador para ver las estadísticas de visitas.
          </p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-light text-sm focus:outline-none focus:border-gold"
            />
            {error && (
              <div className="text-[12px] text-negative">{error}</div>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full px-4 py-2 rounded-lg bg-gold text-black text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const max = Math.max(1, ...stats.days.map((d) => d.count));

  return (
    <div className="p-4 md:p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Visitas
        </h1>
        <button
          onClick={onLogout}
          className="text-[11px] text-text-muted hover:text-text-primary uppercase tracking-wider"
        >
          Salir
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px bg-bg-darkest border border-border-light rounded-xl overflow-hidden mb-5">
        <div className="bg-bg-secondary px-4 py-5 text-center">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Hoy</div>
          <div className="text-3xl font-bold gradient-text">{stats.today}</div>
        </div>
        <div className="bg-bg-secondary px-4 py-5 text-center">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">Total</div>
          <div className="text-3xl font-bold text-gold">{stats.total}</div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 md:p-5">
        <div className="text-[11px] text-text-muted uppercase tracking-wider mb-3">
          Últimos 30 días
        </div>
        <div className="space-y-1.5">
          {stats.days.map((d) => (
            <div key={d.date} className="flex items-center gap-3 text-[12px]">
              <div className="w-20 shrink-0 text-text-muted font-mono">{d.date}</div>
              <div className="flex-1 h-5 bg-bg-secondary rounded overflow-hidden">
                <div
                  className="h-full bg-gold/70"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
              <div className="w-10 text-right font-semibold">{d.count}</div>
            </div>
          ))}
        </div>
        {stats.total === 0 && (
          <div className="text-center text-text-muted text-xs mt-4">
            Aún no hay visitas registradas. Verifica que la hoja <code className="text-gold">Visitas</code> exista
            y que <code className="text-gold">GOOGLE_SERVICE_ACCOUNT_JSON</code> esté configurado.
          </div>
        )}
      </div>
    </div>
  );
}
