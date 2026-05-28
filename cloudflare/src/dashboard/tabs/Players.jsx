import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentPlayerPid, currentSegment } from '../state.js';
import { fetchJson, getReferrals } from '../api.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const SEGMENTS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'active', label: 'Active' },
  { id: 'returning', label: 'Returning' },
  { id: 'champions', label: 'Champions' },
  { id: 'flagged', label: '🚩 Flagged' },
  { id: 'banned', label: '⛔ Banned' },
];

function PlayerLink({ p }) {
  return <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = p.pid; }} style="color:#0ff;text-decoration:none;border-bottom:1px dotted rgba(0,255,255,.3)">{escapeHtml(p.name) || '(anon)'}</a>;
}
function PidLink({ p }) {
  return <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = p.pid; }} style="color:#666;text-decoration:none">{truncatePid(p.pid)}</a>;
}

export function Players({ force }) {
  const [d, setD] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const [referrals, setReferrals] = useState(null);
  const [err, setErr] = useState(null);
  const segment = currentSegment.value || 'all';

  useEffect(() => {
    const cached = loadedAt.value.players;
    const cachedFlagged = loadedAt.value.flaggedPlayers;
    const needPlayers = !cached || Date.now() - cached >= 240000;
    const needFlagged = !cachedFlagged || Date.now() - cachedFlagged >= 240000;

    if (!force && !needPlayers && !needFlagged) return;

    setErr(null);
    const promises = [];
    if (force || needPlayers) promises.push(fetchJson('/stats/players', { force }));
    else promises.push(Promise.resolve(d));
    if (force || needFlagged) promises.push(fetchJson('/stats/flagged-players', { force }));
    else promises.push(Promise.resolve(flagged));
    promises.push(getReferrals(null, { force }));

    Promise.all(promises)
      .then(([pData, fData, rData]) => {
        if (pData) { setD(pData); loadedAt.value = { ...loadedAt.value, players: Date.now() }; }
        if (fData) { setFlagged(fData); loadedAt.value = { ...loadedAt.value, flaggedPlayers: Date.now() }; }
        if (rData) setReferrals(rData);
      })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, players: 0, flaggedPlayers: 0 }; setErr(null); setD(null); setFlagged(null); }} />;
  if (!d || !flagged) return <LoadingPane />;

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

  const referralCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Player', sortable: true, sortType: 'string', render: r => <PlayerLink p={r} /> },
    { key: 'pid', label: 'PID', render: r => <PidLink p={r} />, className: 'pid' },
    { key: 'referrals', label: 'Referrals', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.referrals) },
    { key: 'last_referral_ts', label: 'Last referral', sortable: true, sortType: 'date', render: r => fmtAgo(r.last_referral_ts) },
  ];

  const reviewed = (flagged.players || []).filter(p => p.flag_type === 'review');
  const banned = (flagged.players || []).filter(p => p.flag_type === 'banned');

  async function doAction(endpoint, pid) {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ pid }) });
    const f = await fetchJson('/stats/flagged-players', { force: true });
    setFlagged(f);
  }

  const reviewCols = [
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = r.pid; }} style="color:#0ff;text-decoration:none">{escapeHtml(r.name) || '(anon)'}</a> },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid) },
    { key: 'reason', label: 'Reason', render: r => r.reason || '—' },
    { key: 'flagged_at', label: 'Flagged', sortable: true, sortType: 'date', render: r => fmtAgo(r.flagged_at) },
    { key: 'last_seen', label: 'Last Seen', sortable: true, sortType: 'date', render: r => r.last_seen ? fmtAgo(r.last_seen) : '—' },
    { key: '_actions', label: 'Actions', render: r => (
      <div class="fb-actions">
        <button style="color:#0f8;border-color:#0f8;background:rgba(0,255,136,.1)" onClick={() => doAction('/admin/unflag-player', r.pid)} aria-label="Unflag player">✅ Unflag</button>
        <button style="color:#f44;border-color:#f44;background:rgba(255,68,68,.1)" onClick={() => doAction('/admin/ban-pid', r.pid)} aria-label="Ban player">⛔ Ban</button>
      </div>
    )},
  ];

  const banCols = [
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = r.pid; }} style="color:#0ff;text-decoration:none">{escapeHtml(r.name) || '(anon)'}</a> },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid) },
    { key: 'reason', label: 'Reason', render: r => r.reason || '—' },
    { key: 'flagged_at', label: 'Banned At', sortable: true, sortType: 'date', render: r => fmtAgo(r.flagged_at) },
    { key: 'last_seen', label: 'Last Seen', sortable: true, sortType: 'date', render: r => r.last_seen ? fmtAgo(r.last_seen) : '—' },
    { key: '_actions', label: 'Actions', render: r => (
      <button style="color:#0f8;border-color:#0f8;background:rgba(0,255,136,.1);padding:2px 8px;font-size:.5rem;font-weight:700;border-radius:3px;cursor:pointer;font-family:monospace;border:1px solid" onClick={() => doAction('/admin/unban-pid', r.pid)} aria-label="Unban player">✅ Unban</button>
    )},
  ];

  function setSegment(id) {
    currentSegment.value = id;
  }

  const showAll = segment === 'all';
  const showNew = showAll || segment === 'new';
  const showActive = showAll || segment === 'active';
  const showReturning = showAll || segment === 'returning';
  const showChampions = showAll || segment === 'champions';
  const showFlagged = segment === 'flagged';
  const showBanned = segment === 'banned';

  return (
    <>
      <div class="segment-chips" role="group" aria-label="Player segments">
        {SEGMENTS.map(s => (
          <button
            key={s.id}
            class={`chip segment-chip${segment === s.id ? ' active' : ''}`}
            onClick={() => setSegment(s.id)}
            aria-pressed={segment === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!showFlagged && !showBanned && (
        <>
          {(showAll || showActive) && <>
            <h2>Recently Active</h2>
            <div class="panel scroll-x"><Table columns={recentCols} rows={d.recentActive || []} defaultSort={{ key: 'last_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-recent-active-${range.value}-${today}.csv`} /></div>
          </>}

          {showAll && <>
            <h2>High Motivation (perseverance + streak)</h2>
            <div class="panel scroll-x"><Table columns={motivCols} rows={d.highMotivation || []} defaultSort={{ key: '_score', dir: 'desc' }} filterable exportable exportFilename={`ndj-motivation-${range.value}-${today}.csv`} /></div>
          </>}

          {(showAll || showNew) && <>
            <h2>New Players (in range)</h2>
            <div class="panel scroll-x"><Table columns={newCols} rows={d.newPlayers || []} defaultSort={{ key: 'first_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-new-players-${range.value}-${today}.csv`} /></div>
          </>}

          {(showAll || showReturning) && <>
            <h2>Returning Players (in range)</h2>
            <div class="panel scroll-x"><Table columns={retCols} rows={d.returningPlayers || []} defaultSort={{ key: 'last_seen', dir: 'desc' }} filterable exportable exportFilename={`ndj-returning-${range.value}-${today}.csv`} /></div>
          </>}

          {(showAll || showChampions) && <>
            <h2>★ Champions (all 20 cleared, all-time)</h2>
            <div class="panel scroll-x"><Table columns={champCols} rows={d.champions || []} filterable exportable exportFilename={`ndj-champions-${today}.csv`} /></div>
          </>}

          {(showAll || showActive) && <>
            <h2>Most Active</h2>
            <div class="panel scroll-x"><Table columns={activeCols} rows={d.topActive || []} defaultSort={{ key: 'events', dir: 'desc' }} filterable exportable exportFilename={`ndj-most-active-${range.value}-${today}.csv`} /></div>
          </>}

          {showAll && <>
            <h2>Top Completers</h2>
            <div class="panel scroll-x"><Table columns={completerCols} rows={d.topCompleters || []} defaultSort={{ key: 'completions', dir: 'desc' }} filterable exportable exportFilename={`ndj-completers-${range.value}-${today}.csv`} /></div>

            <h2>Wealthiest</h2>
            <div class="panel scroll-x"><Table columns={goldCols} rows={d.topGold || []} defaultSort={{ key: 'total_gold', dir: 'desc' }} filterable exportable exportFilename={`ndj-wealthiest-${range.value}-${today}.csv`} /></div>

            <h2>Anti-cheat Watchlist</h2>
            <div class="panel scroll-x"><Table columns={watchCols} rows={d.lowestVerified || []} defaultSort={{ key: '_ratio', dir: 'asc' }} filterable exportable exportFilename={`ndj-watchlist-${range.value}-${today}.csv`} /></div>

            <h2>Top Referrers</h2>
            <div class="panel scroll-x">
              {(!referrals || !referrals.top_referrers || !referrals.top_referrers.length) ? (
                <EmptyState message="No referrals yet" hint="Players who bring friends in via QR share appear here" />
              ) : (
                <Table
                  columns={referralCols}
                  rows={referrals.top_referrers}
                  defaultSort={{ key: 'referrals', dir: 'desc' }}
                  exportable
                  exportFilename={`ndj-top-referrers-${range.value}-${today}.csv`}
                />
              )}
            </div>
          </>}
        </>
      )}

      {showFlagged && (
        <>
          <h2>🚩 Under Review ({reviewed.length})</h2>
          <div class="panel scroll-x">
            {reviewed.length === 0 ? <div style="color:#aaa;font-size:.7rem;padding:8px">None</div> : (
              <Table columns={reviewCols} rows={reviewed} defaultSort={{ key: 'flagged_at', dir: 'desc' }} />
            )}
          </div>
        </>
      )}

      {showBanned && (
        <>
          <h2>⛔ Banned ({banned.length})</h2>
          <div class="panel scroll-x">
            {banned.length === 0 ? <div style="color:#aaa;font-size:.7rem;padding:8px">None</div> : (
              <Table columns={banCols} rows={banned} defaultSort={{ key: 'flagged_at', dir: 'desc' }} />
            )}
          </div>
        </>
      )}
    </>
  );
}
