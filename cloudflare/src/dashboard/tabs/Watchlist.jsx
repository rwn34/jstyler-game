import { useState, useEffect } from 'preact/hooks';
import { loadedAt, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Watchlist({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  function load() {
    setErr(null);
    fetchJson('/stats/flagged-players', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, watchlist: Date.now() }; })
      .catch(setErr);
  }

  useEffect(() => {
    const cached = loadedAt.value.watchlist;
    if (!force && cached && Date.now() - cached < 240000) return;
    load();
  }, [force]);

  if (err) return <ErrorState error={err} onRetry={() => { setD(null); load(); }} />;
  if (!d) return <LoadingPane />;

  const reviewed = (d.players || []).filter(p => p.flag_type === 'review');
  const banned = (d.players || []).filter(p => p.flag_type === 'banned');

  async function doAction(endpoint, pid) {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ pid }) });
    load();
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

  if (reviewed.length === 0 && banned.length === 0) {
    return <EmptyState message="No flagged players — healthy state." hint="Use the player modal to flag suspicious accounts." />;
  }

  return (
    <>
      <h2>⚠ Under Review ({reviewed.length})</h2>
      <div class="panel scroll-x">
        {reviewed.length === 0 ? <div style="color:#aaa;font-size:.7rem;padding:8px">None</div> : (
          <Table columns={reviewCols} rows={reviewed} defaultSort={{ key: 'flagged_at', dir: 'desc' }} />
        )}
      </div>

      <h2>⛔ Banned ({banned.length})</h2>
      <div class="panel scroll-x">
        {banned.length === 0 ? <div style="color:#aaa;font-size:.7rem;padding:8px">None</div> : (
          <Table columns={banCols} rows={banned} defaultSort={{ key: 'flagged_at', dir: 'desc' }} />
        )}
      </div>
    </>
  );
}
