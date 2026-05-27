import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchWithCompare, computeDelta } from '../lib/compare.js';
import { fmtNum, fmtDate } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { Heatmap } from '../components/Heatmap.jsx';
import { DayHourHeatmap } from '../components/DayHourHeatmap.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Sessions({ force }) {
  const [d, setD] = useState(null);
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.sessions;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchWithCompare('/stats/sessions', { force })
      .then(r => { setD(r.current); setPrev(r.previous); loadedAt.value = { ...loadedAt.value, sessions: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, sessions: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const f = d.funnel;
  const pf = prev ? prev.funnel : null;
  const sToL = f.session_start > 0 ? Math.round((f.level_start || 0) / f.session_start * 100) : 0;
  const lToC = f.level_start > 0 ? Math.round((f.level_complete || 0) / f.level_start * 100) : 0;
  const cToP = f.level_complete > 0 ? Math.round((f.purchase || 0) / f.level_complete * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);

  const dailyCols = [
    { key: 'day', label: 'Day', render: (r) => { const dt = new Date(Date.now() - ((d.dailyBreakdown.length - 1) - r.day) * 86400000); return fmtDate(dt.getTime()); } },
    { key: 'players', label: 'Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
    { key: 'sessions', label: 'Sessions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.sessions) },
    { key: 'events', label: 'Events', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.events) },
    { key: 'completions', label: 'Wins', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completions) },
  ];

  const deviceCols = [
    { key: 'device', label: 'Device', render: r => <span class="badge">{r.device}</span> },
    { key: 'c', label: 'Sessions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.c) },
    { key: 'players', label: 'Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Sessions" val={fmtNum(d.sessionsToday)} hint="in range" delta={prev ? computeDelta(d.sessionsToday, prev.sessionsToday) : null} />
        <Card label="Level Starts" val={fmtNum(f.level_start || 0)} hint="in range" />
        <Card label="Completions" val={fmtNum(f.level_complete || 0)} cls="live" hint="in range" delta={pf ? computeDelta(f.level_complete, pf.level_complete) : null} />
        <Card label="Deaths" val={fmtNum(f.level_death || 0)} cls="warn" hint="in range" delta={pf ? computeDelta(f.level_death, pf.level_death) : null} deltaInverse />
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

      <h2>Activity by Day & Hour</h2>
      <div class="panel">
        {d.dowHeatmap ? <DayHourHeatmap data={d.dowHeatmap} /> : <EmptyState message="No day-of-week data" />}
        <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace;text-align:center">Sun–Sat × 0–23 UTC+7 • opacity = relative activity</div>
      </div>

      <h2>Hourly Activity (UTC+7)</h2>
      <div class="panel">
        <Heatmap data={d.hourlyActivity} />
        <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace;text-align:center">0–23 (UTC+7) • opacity = relative activity</div>
      </div>

      <h2>Daily Breakdown</h2>
      <div class="panel scroll-x">
        <Table columns={dailyCols} rows={d.dailyBreakdown || []} exportable exportFilename={`ndj-daily-breakdown-${range.value}-${today}.csv`} />
      </div>

      <h2>Death Causes</h2>
      <div class="panel">
        {(!d.deathCauses || !d.deathCauses.length) ? <EmptyState message="No death data" /> : (() => {
          const max = Math.max(...d.deathCauses.map(r => r.c), 1);
          return d.deathCauses.map(r => <BarRow key={r.cause} label={r.cause || 'unknown'} value={r.c} max={max} cls="red" />);
        })()}
      </div>

      <h2>Devices</h2>
      <div class="panel scroll-x">
        <Table columns={deviceCols} rows={d.devices || []} defaultSort={{ key: 'c', dir: 'desc' }} exportable exportFilename={`ndj-devices-${range.value}-${today}.csv`} />
      </div>
    </>
  );
}
