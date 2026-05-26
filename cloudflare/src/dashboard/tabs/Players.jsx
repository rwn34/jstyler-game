import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

function PlayerLink({ p }) {
  return <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = p.pid; }} style="color:#0ff;text-decoration:none;border-bottom:1px dotted rgba(0,255,255,.3)">{escapeHtml(p.name) || '(anon)'}</a>;
}
function PidLink({ p }) {
  return <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = p.pid; }} style="color:#666;text-decoration:none">{truncatePid(p.pid)}</a>;
}

export function Players({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.players;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/players', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, players: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, players: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const today = new Date().toISOString().slice(0, 10);

  const recentCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'cohort', label: 'Cohort', render: r => r.cohort === 'new' ? <span class="badge green">NEW</span> : <span class="badge gold">RETURNING</span> },
    { key: 'last_seen', label: 'Last Seen', sortable: true, sortType: 'date', render: r => fmtAgo(r.last_seen) },
  ];

  const motivCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'perseverance', label: 'Perseverance', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.perseverance || 0) },
    { key: 'streak', label: 'Streak', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.streak || 0) },
    { key: '_score', label: 'Score', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum((r.perseverance || 0) + (r.streak || 0) * 5), exportFormat: v => '' },
  ];

  const newCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'events', label: 'Events', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.events) },
    { key: 'first_seen', label: 'First Seen', sortable: true, sortType: 'date', render: r => fmtAgo(r.first_seen) },
  ];

  const retCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'events', label: 'Events', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.events) },
    { key: 'last_seen', label: 'Last Seen', sortable: true, sortType: 'date', render: r => fmtAgo(r.last_seen) },
  ];

  const champCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <><span>★ </span><PlayerLink p={r} /></> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'cleared', label: 'Cleared', align: 'right', sortable: true, sortType: 'number', className: 'gold', render: r => fmtNum(r.cleared) },
  ];

  const activeCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'events', label: 'Events', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.events) },
    { key: 'last_seen', label: 'Last Seen', sortable: true, sortType: 'date', render: r => fmtAgo(r.last_seen) },
  ];

  const completerCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'completions', label: 'Wins', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completions) },
    { key: 'unique_levels', label: 'Unique Levels', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.unique_levels) + '/20' },
  ];

  const goldCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'total_gold', label: '★ Gold', align: 'right', sortable: true, sortType: 'number', className: 'gold', render: r => fmtNum(Math.round(r.total_gold || 0)) },
    { key: 'total_silver', label: '♦ Silver', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(Math.round(r.total_silver || 0)) },
  ];

  const watchCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'v', label: 'Verified', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.v) },
    { key: 'total', label: 'Total', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.total) },
    { key: '_ratio', label: 'Ratio', align: 'right', sortable: true, sortType: 'number', render: r => { const ratio = r.total > 0 ? Math.round((r.v / r.total) * 100) : 0; return <span class={`badge ${ratio < 30 ? 'bad' : ratio < 60 ? 'warn' : ''}`}>{ratio}%</span>; } },
  ];

  return (
    <>
      <h2>Recently Active</h2>
      <div class="panel scroll-x"><Table columns={recentCols} rows={d.recentActive || []} defaultSort={{ key: 'last_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-recent-active-${range.value}-${today}.csv`} /></div>

      <h2>High Motivation (perseverance + streak)</h2>
      <div class="panel scroll-x"><Table columns={motivCols} rows={d.highMotivation || []} defaultSort={{ key: '_score', dir: 'desc' }} filterable exportable exportFilename={`ndj-motivation-${range.value}-${today}.csv`} /></div>

      <h2>New Players (in range)</h2>
      <div class="panel scroll-x"><Table columns={newCols} rows={d.newPlayers || []} defaultSort={{ key: 'first_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-new-players-${range.value}-${today}.csv`} /></div>

      <h2>Returning Players (in range)</h2>
      <div class="panel scroll-x"><Table columns={retCols} rows={d.returningPlayers || []} defaultSort={{ key: 'last_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-returning-${range.value}-${today}.csv`} /></div>

      <h2>★ Champions (all 20 cleared, all-time)</h2>
      <div class="panel scroll-x"><Table columns={champCols} rows={d.champions || []} filterable exportable exportFilename={`ndj-champions-${today}.csv`} /></div>

      <h2>Most Active</h2>
      <div class="panel scroll-x"><Table columns={activeCols} rows={d.topActive || []} defaultSort={{ key: 'events', dir: 'desc' }} filterable exportable exportFilename={`ndj-most-active-${range.value}-${today}.csv`} /></div>

      <h2>Top Completers</h2>
      <div class="panel scroll-x"><Table columns={completerCols} rows={d.topCompleters || []} defaultSort={{ key: 'completions', dir: 'desc' }} filterable exportable exportFilename={`ndj-completers-${range.value}-${today}.csv`} /></div>

      <h2>Wealthiest</h2>
      <div class="panel scroll-x"><Table columns={goldCols} rows={d.topGold || []} defaultSort={{ key: 'total_gold', dir: 'desc' }} filterable exportable exportFilename={`ndj-wealthiest-${range.value}-${today}.csv`} /></div>

      <h2>Anti-cheat Watchlist</h2>
      <div class="panel scroll-x"><Table columns={watchCols} rows={d.lowestVerified || []} defaultSort={{ key: '_ratio', dir: 'asc' }} filterable exportable exportFilename={`ndj-watchlist-${range.value}-${today}.csv`} /></div>
    </>
  );
}
