'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTeamColorRaw, TEAM_BY_NAME } from '../lib/constants';
import LoadingState, { EmptyState } from '../components/LoadingState';

interface Match {
  date: string;
  team1: string; q1_1: string; q2_1: string; q3_1: string; q4_1: string; ta_1: string; total1: number;
  team2: string; q1_2: string; q2_2: string; q3_2: string; q4_2: string; ta_2: string; total2: number;
}

function matchKey(m: Match): string {
  return `${m.date}|${m.team1}|${m.team2}`;
}

function parseMatch(rows: string[][], date: string): Match {
  const r1 = rows[0] ?? [];
  const r2 = rows[1] ?? [];
  return {
    date,
    team1: r1[0] ?? '', q1_1: r1[1] ?? '', q2_1: r1[2] ?? '', q3_1: r1[3] ?? '', q4_1: r1[4] ?? '', ta_1: r1[5] ?? '', total1: Number(r1[6]) || 0,
    team2: r2[0] ?? '', q1_2: r2[1] ?? '', q2_2: r2[2] ?? '', q3_2: r2[3] ?? '', q4_2: r2[4] ?? '', ta_2: r2[5] ?? '', total2: Number(r2[6]) || 0,
  };
}

function StatCell({ val, width = 38 }: { val: string; width?: number }) {
  return (
    <div
      className="flex items-center justify-center text-[15px] font-bold shrink-0 border-l border-border-light font-mono text-text-primary"
      style={{ width, opacity: val ? 1 : 0.5 }}
    >
      {val || '—'}
    </div>
  );
}

function TeamRow({ name, q1, q2, q3, q4, ta, total, isWinner }: {
  name: string; q1: string; q2: string; q3: string; q4: string; ta: string; total: number; isWinner: boolean;
}) {
  const rawColor = getTeamColorRaw(name);
  const empty = !name;
  return (
    <div
      className="flex items-stretch rounded-lg overflow-hidden bg-bg-secondary"
      style={{
        border: isWinner ? `2px solid ${rawColor}` : '2px solid var(--color-border-light)',
        boxShadow: isWinner ? `0 0 20px ${rawColor}66` : 'none',
        opacity: empty ? 0.3 : 1,
        minHeight: 52,
      }}
    >
      <div className="w-[7px] shrink-0" style={{ background: empty ? 'var(--color-border-light)' : rawColor }} />
      <div className="flex-1 px-3.5 flex items-center text-base font-bold tracking-wider uppercase text-text-primary min-w-0">
        {name || 'POR DEFINIR'}
      </div>
      <StatCell val={q1} />
      <StatCell val={q2} />
      <StatCell val={q3} />
      <StatCell val={q4} />
      <StatCell val={ta} width={42} />
      <div
        className={`w-14 flex items-center justify-center text-[22px] font-black shrink-0 border-l border-border-light font-mono ${isWinner ? 'score-glow' : 'text-text-muted'}`}
        style={{ color: isWinner ? rawColor : undefined }}
      >
        {total}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const w1 = match.total1 > match.total2;
  const w2 = match.total2 > match.total1;
  return (
    <div className="bg-bg-card border border-border-light rounded-[14px] overflow-hidden w-full max-w-[600px]">
      <div className="overflow-x-auto">
        <div className="p-3.5 min-w-[530px]">
          <div className="text-center mb-2.5 text-[13px] tracking-widest text-text-muted uppercase font-semibold">
            {match.date}
          </div>
          {/* Headers mirror the TeamRow flex layout for pixel-perfect alignment */}
          <div className="flex mb-1.5">
            <div className="w-[7px] shrink-0" />
            <div className="flex-1 min-w-0" />
            {['Q1', 'Q2', 'Q3', 'Q4', 'TA', 'TOT'].map((h, i) => (
              <div
                key={h}
                className="text-center text-[11px] tracking-wider text-text-muted font-bold"
                style={{ width: i === 4 ? 42 : i === 5 ? 56 : 38 }}
              >
                {h}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <TeamRow name={match.team1} q1={match.q1_1} q2={match.q2_1} q3={match.q3_1} q4={match.q4_1} ta={match.ta_1} total={match.total1} isWinner={w1} />
            <TeamRow name={match.team2} q1={match.q1_2} q2={match.q2_2} q3={match.q3_2} q4={match.q4_2} ta={match.ta_2} total={match.total2} isWinner={w2} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColHeader({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="text-[11px] font-bold tracking-[0.22em] uppercase text-center pb-4 mb-6 w-full"
      style={{ color, borderBottom: `1px solid ${color}28` }}
    >
      {label}
    </div>
  );
}

function ForkSVG({ topY, bottomY, totalH }: { topY: number; bottomY: number; totalH: number }) {
  const midY = (topY + bottomY) / 2;
  const W = 60;
  return (
    <svg width={W} height={totalH} style={{ overflow: 'visible' }} className="shrink-0 block">
      <line x1={0} y1={topY} x2={W / 2} y2={topY} stroke="var(--color-text-muted)" strokeWidth={2} />
      <line x1={0} y1={bottomY} x2={W / 2} y2={bottomY} stroke="var(--color-text-muted)" strokeWidth={2} />
      <line x1={W / 2} y1={topY} x2={W / 2} y2={bottomY} stroke="var(--color-text-muted)" strokeWidth={2} />
      <line x1={W / 2} y1={midY} x2={W} y2={midY} stroke="var(--color-text-muted)" strokeWidth={2} />
    </svg>
  );
}

function LineSVG({ h }: { h: number }) {
  return (
    <svg width={60} height={h} style={{ overflow: 'visible' }} className="shrink-0 block">
      <line x1={0} y1={h / 2} x2={60} y2={h / 2} stroke="var(--color-text-muted)" strokeWidth={2} />
    </svg>
  );
}

function ChampionBox({ name }: { name: string | null }) {
  const color = name ? getTeamColorRaw(name) : '#ccaa00';
  return (
    <div className="relative overflow-hidden rounded-2xl p-7 text-center w-[220px] border border-[rgba(255,215,0,0.25)]"
      style={{
        background: 'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,130,0,0.04))',
        boxShadow: '0 0 40px rgba(255,200,0,0.08)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%,rgba(255,215,0,0.16) 0%,transparent 70%)' }}
      />
      <div className="text-4xl mb-2.5" role="img" aria-label="trofeo">🏆</div>
      <div className="text-[10px] tracking-[0.24em] text-text-muted uppercase mb-3 font-bold">
        Campeón
      </div>
      {name ? (
        <div className="text-sm font-black tracking-wider uppercase leading-snug" style={{ color }}>
          {name}
        </div>
      ) : (
        <div className="text-sm text-text-muted tracking-wider">Por Definir</div>
      )}
    </div>
  );
}

const CARD_H = 134;
const CARD_GAP = 32;

export default function BracketPage() {
  const [loading, setLoading] = useState(true);
  const [hasPlayIn, setHasPlayIn] = useState(false);
  const [playIn, setPlayIn] = useState<Match[]>([]);
  const [semis, setSemis] = useState<Match[]>([]);
  const [finalMatch, setFinalMatch] = useState<Match | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    async function load() {
      try {
        // Use server-side API route instead of exposing API key
        const fetchRange = async (range: string) => {
          const res = await fetch(
            `/api/sheets?sheet=TablaPosiciones&range=${encodeURIComponent(range)}`,
            { signal }
          );
          const json = await res.json();
          return Array.isArray(json.data) ? json.data : [];
        };

        const titleCell = await fetchRange('L1');
        if (signal.aborted) return;
        const title = (titleCell?.[0]?.[0] ?? '').toUpperCase();
        const withPI = title.includes('PLAY');
        setHasPlayIn(withPI);

        if (withPI) {
          const [pi1, pi2, s1, s2, fin] = await Promise.all([
            fetchRange('L4:R5'), fetchRange('L7:R8'),
            fetchRange('L13:R14'), fetchRange('L16:R17'),
            fetchRange('L22:R23'),
          ]);
          if (signal.aborted) return;
          setPlayIn([parseMatch(pi1, '16/05/2026'), parseMatch(pi2, '16/05/2026')]);
          setSemis([parseMatch(s1, '23/05/2026'), parseMatch(s2, '23/05/2026')]);
          setFinalMatch(parseMatch(fin, '30/05/2026'));
        } else {
          const [s1, s2, fin] = await Promise.all([
            fetchRange('L4:R5'), fetchRange('L7:R8'),
            fetchRange('L13:R14'),
          ]);
          if (signal.aborted) return;
          setSemis([parseMatch(s1, '16/05/2026'), parseMatch(s2, '16/05/2026')]);
          setFinalMatch(parseMatch(fin, '23/05/2026'));
        }
      } catch (e) {
        const name = (e as { name?: string })?.name;
        if (name === 'AbortError' || signal.aborted) return;
        console.error('Bracket error:', e);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    load();
    return () => { controller.abort(); };
  }, []);

  const champion = useMemo(() => {
    if (!finalMatch) return null;
    if (finalMatch.total1 > finalMatch.total2) return finalMatch.team1;
    if (finalMatch.total2 > finalMatch.total1) return finalMatch.team2;
    return null;
  }, [finalMatch]);

  const colH = (n: number) => n * CARD_H + (n - 1) * CARD_GAP;
  const cardCenterY = (i: number) => i * (CARD_H + CARD_GAP) + CARD_H / 2;
  const { semiH, finalOffsetTop } = useMemo(() => {
    const sH = colH(Math.max(semis.length, 2));
    return { semiH: sH, finalOffsetTop: (sH - CARD_H) / 2 };
  }, [semis.length]);
  const HDR_H = 51;

  return (
    <div className="animate-fade-in">
      <div className="text-center py-8 md:py-12">
        <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-[0.14em] uppercase mb-2">
          <span role="img" aria-label="trofeo">🏆</span> Fase Eliminatoria
        </h2>
        <p className="text-[13px] tracking-[0.25em] text-text-muted uppercase">
          Campeonato de Baloncesto · 2026
        </p>
      </div>

      {loading ? (
        <LoadingState message="Cargando bracket..." />
      ) : semis.length === 0 && !finalMatch ? (
        <EmptyState message="Aún no hay datos del bracket. Vuelve cuando comiencen las eliminatorias." />
      ) : (
        <>
          {/* Mobile: stacked layout */}
          <div className="lg:hidden px-4 pb-8 space-y-8">
            {hasPlayIn && playIn.length > 0 && (
              <section>
                <ColHeader label="Play In" color="#e06020" />
                <div className="space-y-4">
                  {playIn.map((m) => <MatchCard key={matchKey(m)} match={m} />)}
                </div>
              </section>
            )}
            <section>
              <ColHeader label="Semifinal" color="#2a8aaa" />
              <div className="space-y-4">
                {semis.map((m, i) => <MatchCard key={i} match={m} />)}
              </div>
            </section>
            <section>
              <ColHeader label="Final" color="#ccaa00" />
              {finalMatch && <MatchCard match={finalMatch} />}
            </section>
            <section className="flex justify-center">
              <ChampionBox name={champion} />
            </section>
          </div>

          {/* Desktop: horizontal bracket */}
          <div className="hidden lg:block overflow-x-auto pb-8 px-4">
            <div className="flex items-start justify-center gap-0 min-w-max">
              {hasPlayIn && (
                <>
                  <div className="flex flex-col items-center shrink-0" style={{ width: 600 }}>
                    <ColHeader label="Play In" color="#e06020" />
                    <div className="flex flex-col gap-8">
                      {playIn.map((m) => <MatchCard key={matchKey(m)} match={m} />)}
                    </div>
                  </div>
                  <div className="flex items-start shrink-0" style={{ paddingTop: HDR_H }}>
                    <ForkSVG topY={cardCenterY(0)} bottomY={cardCenterY(1)} totalH={colH(Math.max(playIn.length, 2))} />
                  </div>
                </>
              )}

              <div className="flex flex-col items-center shrink-0" style={{ width: 600 }}>
                <ColHeader label="Semifinal" color="#2a8aaa" />
                <div className="flex flex-col gap-8">
                  {semis.map((m) => <MatchCard key={matchKey(m)} match={m} />)}
                </div>
              </div>

              <div className="flex items-start shrink-0" style={{ paddingTop: HDR_H }}>
                <ForkSVG topY={cardCenterY(0)} bottomY={cardCenterY(1)} totalH={semiH} />
              </div>

              <div className="flex flex-col items-center shrink-0" style={{ width: 600 }}>
                <ColHeader label="Final" color="#ccaa00" />
                <div style={{ marginTop: finalOffsetTop }}>
                  {finalMatch && <MatchCard match={finalMatch} />}
                </div>
              </div>

              <div className="flex items-start shrink-0" style={{ paddingTop: HDR_H + finalOffsetTop }}>
                <LineSVG h={CARD_H} />
              </div>

              <div className="flex flex-col items-center shrink-0" style={{ minWidth: 220 }}>
                <ColHeader label="Campeón" color="#ccaa00" />
                <div style={{ marginTop: finalOffsetTop }}>
                  <ChampionBox name={champion} />
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-5 py-8 md:py-14">
            {Object.entries(TEAM_BY_NAME).map(([name, team]) => (
              <div key={name} className="flex items-center gap-2 text-[13px] text-text-muted tracking-wider">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{
                    background: team.color,
                    border: team.color === '#FFFFFF' ? '1px solid #445' : 'none',
                  }}
                />
                {name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
