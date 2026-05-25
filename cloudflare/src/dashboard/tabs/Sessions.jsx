import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtDate } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { Heatmap } from '../components/Heatmap.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Sessions({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.sessions;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/sessions', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, sessions: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  const f = d.funnel;
  const sToL = f.session_start > 0 ? Math.round((f.level_start || 0) / f.session_start * 100) : 0;
  const lToC = f.level_start > 0 ? Math.round((f.level_complete || 0) / f.level_start * 100) : 0;
  const cToP = f.level_complete > 0 ? Math.round((f.purchase || 0) / f.level_complete * 100) : 0;

  return (
    <>
      <div class="grid">
        <Card label="Sessions" val={fmtNum(d.sessionsToday)} hint="in range" />
        <Card label="Level Starts" val={fmtNum(f.level_start || 0)} hint="in range" />
        <Card label="Completions" val={fmtNum(f.level_complete || 0)} cls="live" hint="in range" />
        <Card label="Deaths" val={fmtNum(f.level_death || 0)} cls="warn" hint="in range" />
        <Card label="Purchases" val={fmtNum(f.purchase || 0)} cls="gold" hint="in range" />
        <Card label="S→L Rate" val={sToL + '%'} hint="session→start" />
        <Card label="L→C Rate" val={lToC + '%'} hint="start→complete" />
        <Card label="C→P Rate" val={cToP + '%'} cls="gold" hint="complete→purchase" />
      </div>

      <h2>Session Duration</h2>
      <div class="panel"><div class="grid">
        <Card label="Short" val={fmtNum(d.sessionDurations.short || 0)} hint="<5 min" />
        <Card label="Medium" val={fmtNum(d.sessionDurations.medium || 0)} cls="live" hint="5-30 min" />
        <Card label="Long" val={fmtNum(d.sessionDurations.long || 0)} cls="gold" hint="30+ min" />
      </div></div>

      <h2>Hourly Activity (UTC+7)</h2>
      <div class="panel">
        <Heatmap data={d.hourlyActivity} />
        <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace;text-align:center">0–23 (UTC+7) • opacity = relative activity</div>
      </div>

      <h2>Daily Breakdown</h2>
      <div class="panel scroll-x"><table><thead><tr><th>Day</th><th class="num">Players</th><th class="num">Sessions</th><th class="num">Events</th><th class="num">Wins</th></tr></thead><tbody>
        {(d.dailyBreakdown || []).map((r, idx) => {
          const dt = new Date(Date.now() - ((d.dailyBreakdown.length - 1) - r.day) * 86400000);
          return <tr key={idx}><td>{fmtDate(dt.getTime())}</td><td class="num">{fmtNum(r.players)}</td><td class="num">{fmtNum(r.sessions)}</td><td class="num">{fmtNum(r.events)}</td><td class="num">{fmtNum(r.completions)}</td></tr>;
        })}
      </tbody></table></div>

      <h2>Death Causes</h2>
      <div class="panel">
        {(!d.deathCauses || !d.deathCauses.length) ? <div style="color:#666">No data</div> : (() => {
          const max = Math.max(...d.deathCauses.map(r => r.c), 1);
          return d.deathCauses.map(r => <BarRow key={r.cause} label={r.cause || 'unknown'} value={r.c} max={max} cls="red" />);
        })()}
      </div>

      <h2>Devices</h2>
      <div class="panel scroll-x"><table><thead><tr><th>Device</th><th class="num">Sessions</th><th class="num">Players</th></tr></thead><tbody>
        {(d.devices || []).map(r => <tr key={r.device}><td><span class="badge">{r.device}</span></td><td class="num">{fmtNum(r.c)}</td><td class="num">{fmtNum(r.players)}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
