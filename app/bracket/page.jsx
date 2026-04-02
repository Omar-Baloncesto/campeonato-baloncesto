"use client";

import { useEffect, useState } from "react";

const SHEET_ID = "1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0";
const API_KEY  = "AIzaSyAOB3-strsf9o5VbkGdlXTalHyUPvSN7Sc";
const TAB      = "TablaPosiciones";

const TEAM_COLORS = {
  "Miami Heat":            "#FFFFFF",
  "Brooklyn Nets":         "#AAAAAA",
  "Boston Celtics":        "#00FF00",
  "Oklahoma City Thunder": "#00BFFF",
  "Los Angeles Lakers":    "#FFD700",
  "Toronto Raptors":       "#FF0000",
};

function teamColor(name) { return TEAM_COLORS[name] ?? "#555566"; }
function teamGlow(name) {
  const c = teamColor(name);
  return c === "#FFFFFF" ? "0 0 20px rgba(255,255,255,0.4)" : `0 0 20px ${c}66`;
}

async function fetchRange(range) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
    `${encodeURIComponent(TAB + "!" + range)}?key=${API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  return json.values ?? [];
}

function parseMatch(rows, date) {
  const r1 = rows[0] ?? [];
  const r2 = rows[1] ?? [];
  return {
    date,
    team1: r1[0]??"", q1_1:r1[1]??"", q2_1:r1[2]??"", q3_1:r1[3]??"", q4_1:r1[4]??"", ta_1:r1[5]??"", total1:Number(r1[6])||0,
    team2: r2[0]??"", q1_2:r2[1]??"", q2_2:r2[2]??"", q3_2:r2[3]??"", q4_2:r2[4]??"", ta_2:r2[5]??"", total2:Number(r2[6])||0,
  };
}

function StatCell({ val, width = 38 }) {
  return (
    <div style={{
      width, display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:15, fontWeight:700,
      color: val ? "#ffffff" : "#8899aa",
      borderLeft:"1px solid rgba(255,255,255,0.10)",
      fontFamily:"'Barlow Condensed',monospace",
      flexShrink:0,
    }}>
      {val || "—"}
    </div>
  );
}

function TeamRow({ name, q1, q2, q3, q4, ta, total, isWinner }) {
  const color = teamColor(name);
  const empty = !name;
  return (
    <div style={{
      display:"flex", alignItems:"stretch",
      borderRadius:10, overflow:"hidden",
      border: isWinner ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.09)",
      boxShadow: isWinner ? teamGlow(name) : "none",
      background:"rgba(10,10,22,0.98)",
      opacity: empty ? 0.3 : 1,
      minHeight:52,
    }}>
      <div style={{ width:7, background: empty?"#1c1c2e":color, flexShrink:0 }} />
      <div style={{
        flex:1, padding:"0 14px",
        display:"flex", alignItems:"center",
        fontFamily:"'Barlow Condensed',sans-serif",
        fontSize:16, fontWeight:700, letterSpacing:"0.06em",
        textTransform:"uppercase",
        color: empty ? "#445566" : "#f0f0ff",
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        minWidth:0,
      }}>
        {name || "POR DEFINIR"}
      </div>
      <StatCell val={q1} />
      <StatCell val={q2} />
      <StatCell val={q3} />
      <StatCell val={q4} />
      <StatCell val={ta} width={42} />
      <div style={{
        width:56, display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:22, fontWeight:900,
        color: isWinner ? color : "#aabbcc",
        borderLeft:"1px solid rgba(255,255,255,0.12)",
        fontFamily:"'Barlow Condensed',monospace",
        flexShrink:0,
      }}>
        {total}
      </div>
    </div>
  );
}

function MatchCard({ match }) {
  const w1 = match.total1 > match.total2;
  const w2 = match.total2 > match.total1;
  return (
    <div style={{
      background:"rgba(14,14,28,0.96)",
      border:"1px solid rgba(255,255,255,0.10)",
      borderRadius:14, padding:"14px 14px 12px",
      width:460,
    }}>
      {/* fecha */}
      <div style={{
        textAlign:"center", marginBottom:10,
        fontSize:13, letterSpacing:"0.18em",
        color:"#aabbcc",
        textTransform:"uppercase",
        fontFamily:"'Barlow Condensed',sans-serif",
        fontWeight:600,
      }}>
        {match.date}
      </div>
      {/* headers */}
      <div style={{ display:"flex", paddingLeft:188, marginBottom:5 }}>
        {["Q1","Q2","Q3","Q4","TA","TOT"].map((h,i)=>(
          <div key={h} style={{
            width: i===4?42 : i===5?56 : 38,
            textAlign:"center",
            fontSize:11, letterSpacing:"0.14em",
            color:"#aabbcc",
            fontFamily:"'Barlow Condensed',sans-serif",
            fontWeight:700,
          }}>{h}</div>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        <TeamRow name={match.team1} q1={match.q1_1} q2={match.q2_1} q3={match.q3_1} q4={match.q4_1} ta={match.ta_1} total={match.total1} isWinner={w1} />
        <TeamRow name={match.team2} q1={match.q1_2} q2={match.q2_2} q3={match.q3_2} q4={match.q4_2} ta={match.ta_2} total={match.total2} isWinner={w2} />
      </div>
    </div>
  );
}

function ColHeader({ label, color }) {
  return (
    <div style={{
      fontFamily:"'Orbitron',sans-serif",
      fontSize:11, fontWeight:700, letterSpacing:"0.22em",
      textTransform:"uppercase", color,
      textAlign:"center",
      paddingBottom:16,
      borderBottom:`1px solid ${color}28`,
      marginBottom:24, width:"100%",
    }}>
      {label}
    </div>
  );
}

function ForkSVG({ topY, bottomY, totalH }) {
  const midY = (topY + bottomY) / 2;
  const W = 60;
  return (
    <svg width={W} height={totalH} style={{ overflow:"visible", flexShrink:0, display:"block" }}>
      <line x1={0}   y1={topY}    x2={W/2} y2={topY}    stroke="#2a5070" strokeWidth={2} />
      <line x1={0}   y1={bottomY} x2={W/2} y2={bottomY} stroke="#2a5070" strokeWidth={2} />
      <line x1={W/2} y1={topY}    x2={W/2} y2={bottomY} stroke="#2a5070" strokeWidth={2} />
      <line x1={W/2} y1={midY}    x2={W}   y2={midY}    stroke="#2a5070" strokeWidth={2} />
    </svg>
  );
}

function LineSVG({ h }) {
  return (
    <svg width={60} height={h} style={{ overflow:"visible", flexShrink:0, display:"block" }}>
      <line x1={0} y1={h/2} x2={60} y2={h/2} stroke="#2a5070" strokeWidth={2} />
    </svg>
  );
}

function ChampionBox({ name }) {
  const color = name ? teamColor(name) : "#ccaa00";
  return (
    <div style={{
      position:"relative", overflow:"hidden",
      borderRadius:18, padding:"28px 28px 26px",
      textAlign:"center",
      background:"linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,130,0,0.04))",
      border:"1px solid rgba(255,215,0,0.25)",
      width:220,
      boxShadow:"0 0 40px rgba(255,200,0,0.08)",
    }}>
      <div style={{
        position:"absolute", inset:0,
        background:"radial-gradient(circle at 50% 0%,rgba(255,215,0,0.16) 0%,transparent 70%)",
        pointerEvents:"none",
      }}/>
      <div style={{ fontSize:40, marginBottom:10 }}>🏆</div>
      <div style={{
        fontSize:10, letterSpacing:"0.24em", color:"#aabbcc",
        textTransform:"uppercase", marginBottom:12,
        fontFamily:"'Barlow Condensed',sans-serif",
        fontWeight:700,
      }}>Campeón</div>
      {name
        ? <div style={{
            fontFamily:"'Orbitron',sans-serif",
            fontSize:14, fontWeight:900,
            letterSpacing:"0.06em", textTransform:"uppercase",
            color, lineHeight:1.4,
          }}>{name}</div>
        : <div style={{
            fontFamily:"'Barlow Condensed',sans-serif",
            fontSize:14, color:"#aabbcc", letterSpacing:"0.1em",
          }}>Por Definir</div>
      }
    </div>
  );
}

const CARD_H  = 134;
const CARD_GAP = 32;

export default function BracketPage() {
  const [loading,    setLoading]    = useState(true);
  const [hasPlayIn,  setHasPlayIn]  = useState(false);
  const [playIn,     setPlayIn]     = useState([]);
  const [semis,      setSemis]      = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const titleCell = await fetchRange("L1");
        const title     = (titleCell?.[0]?.[0] ?? "").toUpperCase();
        const withPI    = title.includes("PLAY");
        setHasPlayIn(withPI);

        if (withPI) {
          const [pi1,pi2,s1,s2,fin] = await Promise.all([
            fetchRange("L4:R5"),
            fetchRange("L7:R8"),
            fetchRange("L13:R14"),
            fetchRange("L16:R17"),
            fetchRange("L22:R23"),
          ]);
          setPlayIn([parseMatch(pi1,"16/05/2026"), parseMatch(pi2,"16/05/2026")]);
          setSemis ([parseMatch(s1, "23/05/2026"), parseMatch(s2, "23/05/2026")]);
          setFinalMatch(parseMatch(fin,"30/05/2026"));
        } else {
          const [s1,s2,fin] = await Promise.all([
            fetchRange("L4:R5"),
            fetchRange("L7:R8"),
            fetchRange("L13:R14"),
          ]);
          setSemis([parseMatch(s1,"16/05/2026"), parseMatch(s2,"16/05/2026")]);
          setFinalMatch(parseMatch(fin,"23/05/2026"));
        }
      } catch(e) {
        console.error("Bracket error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const champion =
    finalMatch?.total1 > finalMatch?.total2 ? finalMatch.team1 :
    finalMatch?.total2 > finalMatch?.total1 ? finalMatch.team2 : null;

  const colH           = (n) => n * CARD_H + (n - 1) * CARD_GAP;
  const cardCenterY    = (i) => i * (CARD_H + CARD_GAP) + CARD_H / 2;
  const piH            = colH(Math.max(playIn.length, 2));
  const semiH          = colH(Math.max(semis.length, 2));
  const finalOffsetTop = (semiH - CARD_H) / 2;
  const HDR_H          = 51;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Orbitron:wght@700;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body { background:#07070f; }
        .bp {
          min-height:100vh;
          background:
            radial-gradient(ellipse at 10% 10%, rgba(0,70,180,0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 90%, rgba(180,30,30,0.07) 0%, transparent 50%),
            #07070f;
          padding:48px 32px 80px;
          font-family:'Barlow Condensed',sans-serif;
        }
        .page-title { text-align:center; margin-bottom:56px; }
        .page-title h1 {
          font-family:'Orbitron',sans-serif;
          font-size:32px; font-weight:900; color:#fff;
          letter-spacing:0.14em; text-transform:uppercase; margin-bottom:8px;
        }
        .page-title p { font-size:13px; letter-spacing:0.25em; color:#aabbcc; text-transform:uppercase; }
        .bracket-row {
          display:flex; align-items:flex-start;
          justify-content:center; gap:0;
          overflow-x:auto; padding-bottom:20px;
        }
        .b-col   { display:flex; flex-direction:column; align-items:center; flex-shrink:0; }
        .b-cards { display:flex; flex-direction:column; gap:32px; }
        .b-conn  { display:flex; align-items:flex-start; padding-top:51px; flex-shrink:0; }
        .loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; gap:16px; }
        .spinner { width:44px; height:44px; border:3px solid rgba(255,255,255,0.08); border-top-color:#4af; border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to{ transform:rotate(360deg) } }
        .legend { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-top:56px; }
        .legend-item { display:flex; align-items:center; gap:8px; font-size:13px; color:#aabbcc; letter-spacing:0.06em; }
        .legend-dot  { width:12px; height:12px; border-radius:3px; flex-shrink:0; }
      `}</style>

      <div className="bp">
        <div className="page-title">
          <h1>🏆 Fase Eliminatoria</h1>
          <p>Campeonato de Baloncesto · 2026</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"/>
            <span style={{color:"#aabbcc",fontSize:13,letterSpacing:"0.18em",textTransform:"uppercase"}}>
              Cargando bracket…
            </span>
          </div>
        ) : (
          <>
            <div className="bracket-row">

              {hasPlayIn && (
                <>
                  <div className="b-col" style={{width:460}}>
                    <ColHeader label="Play In" color="#e06020" />
                    <div className="b-cards">
                      {playIn.map((m,i) => <MatchCard key={i} match={m} />)}
                    </div>
                  </div>
                  <div className="b-conn">
                    <ForkSVG topY={cardCenterY(0)} bottomY={cardCenterY(1)} totalH={piH} />
                  </div>
                </>
              )}

              <div className="b-col" style={{width:460}}>
                <ColHeader label="Semifinal" color="#2a8aaa" />
                <div className="b-cards">
                  {semis.map((m,i) => <MatchCard key={i} match={m} />)}
                </div>
              </div>

              <div className="b-conn">
                <ForkSVG topY={cardCenterY(0)} bottomY={cardCenterY(1)} totalH={semiH} />
              </div>

              <div className="b-col" style={{width:460}}>
                <ColHeader label="Final" color="#ccaa00" />
                <div style={{marginTop: finalOffsetTop}}>
                  {finalMatch && <MatchCard match={finalMatch} />}
                </div>
              </div>

              <div className="b-conn" style={{paddingTop: HDR_H + finalOffsetTop}}>
                <LineSVG h={CARD_H} />
              </div>

              <div className="b-col" style={{minWidth:220}}>
                <ColHeader label="Campeón" color="#ccaa00" />
                <div style={{marginTop: finalOffsetTop}}>
                  <ChampionBox name={champion} />
                </div>
              </div>

            </div>

            <div className="legend">
              {Object.entries(TEAM_COLORS).map(([name,color])=>(
                <div key={name} className="legend-item">
                  <div className="legend-dot" style={{
                    background:color,
                    border: color==="#FFFFFF" ? "1px solid #445" : "none",
                  }}/>
                  {name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}