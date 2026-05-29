import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentFilters } from '../state.js';
import { fetchJson } from '../api.js';
import { fetchWithCompare, compareEnabled } from '../lib/compare.js';
import { fmtNum, fmtDate } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { Heatmap } from '../components/Heatmap.jsx';
import { DayHourHeatmap } from '../components/DayHourHeatmap.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { computeDelta } from '../lib/compare.js';

export function Activity({ force }) {
  const [sessionsData, setSessionsData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [sessionsPrev, setSessionsPrev] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cachedSess = loadedAt.value.activitySessions;
    const cachedEng = loadedAt.value.activityEngagement;
    const cachedCompare = loadedAt.value.activityCompare;
    const compareNow = compareEnabled.value;
    if (!force && cachedSess && Date.now() - cachedSess < 240000 && cachedEng && Date.now() - cachedEng < 240000 && cachedCompare === compareNow) return;

    setErr(null);
    Promise.all([
      fetchWithCompare('/stats/sessions', { force }),
      fetchJson('/stats/ui', { force }),
    ])
      .then(([sess, eng]) => {
        setSessionsData(sess.current);
        setSessionsPrev(sess.previous);
        setEngagementData(eng);
        loadedAt.value = {
          ...loadedAt.value,
          activitySessions: Date.now(),
          activityEngagement: Date.now(),
          activityCompare: compareNow,
        };
      })
      .catch(setErr);
  }, [range.value, force, compareEnabled.value, currentFilters.value]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, activitySessions: 0, activityEngagement: 0 }; setErr(null); setSessionsData(null); setEngagementData(null); }} />;
  if (!sessionsData || !engagementData) return <LoadingPane />;

  const f = sessionsData.funnel;
  const pf = sessionsPrev ? sessionsPrev.funnel : null;
  const sToL = f.session_start > 0 ? Math.round((f.level_start || 0) / f.session_start * 100) : 0;
  const lToC = f.level_start > 0 ? Math.round((f.level_complete || 0) / f.level_start * 100) : 0;
  const cToP = f.level_complete > 0 ? Math.round((f.purchase || 0) / f.level_complete * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);

  const dailyCols = [
    { key: 'day', label: 'Day', render: (r) => { const dt = new Date(Date.now() - ((sessionsData.dailyBreakdown.length - 1) - r.day) * 86400000); return fmtDate(dt.getTime()); } },
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

  const displayTotal = (engagementData.displayMode || []).reduce((s, r) => s + r.c, 0);
  const fmap = {};
  (engagementData.installFunnel || []).forEach(r => { fmap[r.action] = r.c; });
  const pwaStages = [
    { k: 'pwa_prompt_shown', label: '1. Prompted', cls: '' },
    { k: 'pwa_install_accepted', label: '2. Accepted', cls: 'green' },
    { k: 'pwa_install_dismissed', label: '2. Dismissed', cls: 'warn' },
    { k: 'pwa_appinstalled', label: '3. Installed', cls: 'gold' },
  ];
  const fmax = Math.max(...pwaStages.map(s => fmap[s.k] || 0), 1);
  const clickRows = (engagementData.clicks || []).filter(r => r.action && !r.action.startsWith('pwa_') && r.action !== 'store_tab');
  const cmax = Math.max(...clickRows.map(r => r.c), 1);
  const stRows = engagementData.storeTabs || [];
  const smax = Math.max(...stRows.map(r => r.c), 1);

  return (
    <>
      <h2>Lifecycle</h2>
      <div class="grid">
        <Card label="Sessions" val={fmtNum(sessionsData.sessionsToday)} hint="in range" delta={sessionsPrev ? computeDelta(sessionsData.sessionsToday, sessionsPrev.sessionsToday) : null} />
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
        <Card label="Short" val={fmtNum(sessionsData.sessionDurations.short || 0)} hint="<5 min" />
        <Card label="Medium" val={fmtNum(sessionsData.sessionDurations.medium || 0)} cls="live" hint="5-30 min" />
        <Card label="Long" val={fmtNum(sessionsData.sessionDurations.long || 0)} cls="gold" hint="30+ min" />
      </div></div>

      <h2>Activity by Day & Hour (UTC+7)</h2>
      <div class="panel">
        {sessionsData.dowHeatmap ? <DayHourHeatmap data={sessionsData.dowHeatmap} /> : <EmptyState message="No day-of-week data" />}
        <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace;text-align:center">Sun–Sat × 0–23 UTC+7 • opacity = relative activity</div>
      </div>

      <h2>Hourly Activity (UTC+7)</h2>
      <div class="panel">
        <Heatmap data={sessionsData.hourlyActivity} />
        <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace;text-align:center">0–23 (UTC+7) • opacity = relative activity</div>
      </div>

      <h2>Quality</h2>
      <div class="grid">
        {(engagementData.displayMode || []).map(r => {
          const pct = displayTotal > 0 ? Math.round(r.c / displayTotal * 100) : 0;
          return <Card key={r.display} label={(r.display || 'unknown').toUpperCase()} val={fmtNum(r.players) + ' players'} cls={r.display === 'standalone' ? 'gold' : ''} hint={pct + '% of sessions (' + fmtNum(r.c) + ')'} />;
        })}
        {(!engagementData.displayMode || !engagementData.displayMode.length) && <div style="color:#666;padding:14px">No display mode data yet</div>}
      </div>

      <h2>PWA Install Funnel</h2>
      <div class="panel">
        {pwaStages.map(s => <BarRow key={s.k} label={s.label} value={fmap[s.k] || 0} max={fmax} cls={s.cls} />)}
      </div>

      <h2>Button Click Counts</h2>
      <div class="panel">
        {!clickRows.length ? <div style="color:#666">No data yet</div> : clickRows.map(r => (
          <BarRow key={r.action} label={(r.action || '?').replace('_clicked', '').replace(/_/g, ' ')} value={r.c} max={cmax} countText={fmtNum(r.c) + ' (' + fmtNum(r.players) + ' p)'} />
        ))}
      </div>

      <h2>Daily Breakdown</h2>
      <div class="panel scroll-x">
        <Table columns={dailyCols} rows={sessionsData.dailyBreakdown || []} exportable exportFilename={`ndj-daily-breakdown-${range.value}-${today}.csv`} />
      </div>

      <h2>Devices</h2>
      <div class="panel scroll-x">
        <Table columns={deviceCols} rows={sessionsData.devices || []} defaultSort={{ key: 'c', dir: 'desc' }} exportable exportFilename={`ndj-devices-${range.value}-${today}.csv`} />
      </div>
    </>
  );
}
