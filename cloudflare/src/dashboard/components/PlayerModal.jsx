import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs, fmtAgo, fmtDateTime, escapeHtml, truncatePid } from '../format.js';
import { LEVEL_NAMES, COUNTRY_FLAGS, COUNTRY_NAMES } from '../constants.js';
import { Card } from './Card.jsx';
import { Heatmap } from './Heatmap.jsx';
import { BarRow } from './BarRow.jsx';
import { Table } from './Table.jsx';
import { LoadingPane } from './LoadingPane.jsx';
import { ErrorState } from './ErrorState.jsx';

export function PlayerModal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const pid = currentPlayerPid.value;

  useEffect(() => {
    if (!pid) { setData(null); return; }
    triggerRef.current = document.activeElement;
    setLoading(true); setError(null);
    fetchJson('/stats/player?pid=' + encodeURIComponent(pid))
      .then(d => setData(d))
      .catch(e => setError(e))
      .finally(() => setLoading(false));
  }, [pid]);

  // Focus trap + Esc close
  useEffect(() => {
    if (!pid) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = modal.querySelectorAll('button,input,textarea,a[href],[tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => { if (closeRef.current) closeRef.current.focus(); }, 50);
    return () => document.removeEventListener('keydown', onKey);
  }, [pid]);

  if (!pid) return null;

  function close() {
    currentPlayerPid.value = null;
    if (triggerRef.current && triggerRef.current.focus) triggerRef.current.focus();
  }

  return (
    <div class="player-modal open" ref={modalRef} role="dialog" aria-modal="true" aria-label="Player profile">
      <div class="player-modal-inner">
        <button class="close-btn" ref={closeRef} onClick={close} aria-label="Close player profile">✕ CLOSE</button>
        <h1 style="margin-bottom:6px">★ Player Profile</h1>
        {loading && <LoadingPane />}
        {error && <ErrorState error={error} onRetry={() => { setError(null); setLoading(true); fetchJson('/stats/player?pid=' + encodeURIComponent(pid)).then(setData).catch(setError).finally(() => setLoading(false)); }} />}
        {data && <PlayerDetail d={data} pid={pid} setData={setData} />}
      </div>
    </div>
  );
}

function PlayerActions({ d, pid, setData }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function doAction(endpoint) {
    setBusy(true);
    try {
      await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ pid, reason: reason || undefined }) });
      // Re-fetch player data
      const d = await fetchJson('/stats/player?pid=' + encodeURIComponent(pid));
      setData(d);
      setReason('');
    } catch (_) {}
    setBusy(false);
  }

  const flag = d.flag;
  const isFlagged = flag && flag.flag_type === 'review';
  const isBanned = flag && flag.flag_type === 'banned';

  return (
    <div class="player-actions">
      {isFlagged && <span class="badge warn">⚠ Under Review</span>}
      {isBanned && <span class="badge bad">⛔ Banned</span>}
      <input class="reason-input" type="text" placeholder="Reason (optional)" value={reason} onInput={e => setReason(e.target.value)} aria-label="Reason for flag or ban" />
      {!isFlagged && !isBanned && <button class="flag-btn" disabled={busy} onClick={() => doAction('/admin/flag-player')} aria-label="Flag player for review">⚠ Flag</button>}
      {isFlagged && <button class="ok-btn" disabled={busy} onClick={() => doAction('/admin/unflag-player')} aria-label="Remove flag">✅ Unflag</button>}
      {!isBanned && <button class="ban-btn" disabled={busy} onClick={() => doAction('/admin/ban-pid')} aria-label="Ban player">⛔ Ban</button>}
      {isBanned && <button class="ok-btn" disabled={busy} onClick={() => doAction('/admin/unban-pid')} aria-label="Unban player">✅ Unban</button>}
    </div>
  );
}

function PlayerDetail({ d, pid, setData }) {
  const champBadge = d.isChampion ? <span class="badge gold">★ MASTER</span> : null;
  const returnBadge = d.isReturning ? <span class="badge gold">RETURNING</span> : <span class="badge warn">TRIAL</span>;
  const flag = d.country ? (COUNTRY_FLAGS[d.country] || '🌍') + ' ' + (COUNTRY_NAMES[d.country] || d.country) : '';

  const today = new Date().toISOString().slice(0, 10);
  const levelCols = [
    { key: 'level', label: '#', sortable: true, sortType: 'number', render: r => r.level + 1 },
    { key: '_name', label: 'Name', render: r => LEVEL_NAMES[r.level] },
    { key: 'starts', label: 'Starts', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.starts) },
    { key: 'completes', label: 'Wins', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completes) },
    { key: 'deaths', label: 'Deaths', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.deaths) },
    { key: 'bestMs', label: 'Best', align: 'right', sortable: true, sortType: 'number', render: r => fmtMs(r.bestMs) },
    { key: 'avgMs', label: 'Avg', align: 'right', sortable: true, sortType: 'number', render: r => fmtMs(r.avgMs) },
    { key: 'gold', label: '★', align: 'right', sortable: true, sortType: 'number', className: 'gold', render: r => fmtNum(r.gold) },
    { key: 'silver', label: '♦', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.silver) },
    { key: 'resurrects', label: 'Resur.', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.resurrects) },
  ];

  const levelRows = d.perLevel.filter(l => l.starts > 0 || l.completes > 0 || l.deaths > 0);

  return (
    <>
      <div style="font-family:monospace;font-size:.75rem;color:#bbb;margin-bottom:6px">
        <b style="color:#0ff;font-size:1.1rem">{escapeHtml(d.name) || '(anon)'}</b> {champBadge} {returnBadge}
        <br />PID: <code style="color:#aaa">{d.pid}</code> • {flag}
        <br />First seen: {fmtDateTime(d.firstSeen)} • Last seen: {fmtDateTime(d.lastSeen)} ({fmtAgo(d.lastSeen)})
      </div>

      <PlayerActions d={d} pid={pid} setData={setData} />

      <div class="grid">
        <Card label="Sessions" val={fmtNum(d.sessionCount)} />
        <Card label="Days Active" val={fmtNum(d.daysActive)} />
        <Card label="Total Events" val={fmtNum(d.totalEvents)} />
        <Card label="Verified" val={d.verifiedRatio + '%'} cls={d.verifiedRatio < 60 ? 'warn' : ''} />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Levels Reached" val={fmtNum(d.uniqueLevels) + '/20'} />
        <Card label="Total Wins" val={fmtNum(d.perLevel.reduce((s, l) => s + l.completes, 0))} cls="live" />
        <Card label="Total Deaths" val={fmtNum(d.perLevel.reduce((s, l) => s + l.deaths, 0))} cls="warn" />
        <Card label="Favorite Stage" val={d.favoriteStage >= 0 ? (d.favoriteStage + 1) + '. ' + (LEVEL_NAMES[d.favoriteStage] || '?') : '—'} cls="gold" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="★ Gold Earned" val={fmtNum(d.totalGoldEarned)} cls="gold" />
        <Card label="★ Gold Spent" val={fmtNum(d.totalGoldSpent)} />
        <Card label="♦ Silver Earned" val={fmtNum(d.totalSilverEarned)} />
        <Card label="♦ Silver Spent" val={fmtNum(d.totalSilverSpent)} />
      </div>

      {d.equipment && (
        <>
          <h2>Current Equipment</h2>
          <div class="panel">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">
              <div><div class="lbl">EQUIPPED SKILLS</div><div style="color:#0ff;font-family:monospace">{d.equipment.skills.length ? d.equipment.skills.map(s => <div key={s}>⚡ {s}</div>) : '—'}</div></div>
              <div><div class="lbl">COSMETICS</div><div style="color:#f0f;font-family:monospace">{Object.keys(d.equipment.cosmetics).length ? Object.entries(d.equipment.cosmetics).map(([k, v]) => <div key={k}>{k}: {v}</div>) : '—'}</div></div>
              <div><div class="lbl">CONSUMABLE STOCK</div><div style="color:#0f8;font-family:monospace">{Object.keys(d.equipment.inv).filter(k => d.equipment.inv[k] > 0).length ? Object.entries(d.equipment.inv).filter(([, v]) => v > 0).map(([k, v]) => <div key={k}>{k}: {v}</div>) : '—'}</div></div>
            </div>
          </div>
        </>
      )}

      <h2>Per-Level Stats</h2>
      <div class="panel scroll-x">
        <Table columns={levelCols} rows={levelRows} defaultSort={{ key: 'level', dir: 'asc' }} exportable exportFilename={`ndj-player-${d.pid}-levels-${today}.csv`} />
      </div>

      <h2>Activity by Hour (UTC+7)</h2>
      <div class="panel">
        <Heatmap data={d.hourlyActivity} />
      </div>

      {d.deathCauses.length > 0 && (
        <>
          <h2>Death Causes</h2>
          <div class="panel">
            {(() => { const max = Math.max(...d.deathCauses.map(r => r.c), 1); return d.deathCauses.map(r => <BarRow key={r.cause} label={r.cause || 'unknown'} value={r.c} max={max} cls="red" />); })()}
          </div>
        </>
      )}

      <h2>Inventory & Purchases</h2>
      <div class="panel">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
          <div><div class="lbl">SKILLS BOUGHT ({d.ownedSkills.length})</div>{d.ownedSkills.length ? d.ownedSkills.map(s => <div key={s.id} style="font-size:.65rem;color:#0ff">⚡ {s.id} ×{s.count}</div>) : <div style="color:#aaa">none</div>}</div>
          <div><div class="lbl">COSMETICS ({d.ownedCosmetics.length})</div>{d.ownedCosmetics.length ? d.ownedCosmetics.map(c => <div key={c.id} style="font-size:.65rem;color:#f0f">🎨 {c.id}</div>) : <div style="color:#aaa">none</div>}</div>
          <div><div class="lbl">CONSUMABLES</div>{d.ownedConsumables.length ? d.ownedConsumables.map(c => <div key={c.id} style="font-size:.65rem;color:#0f8">💊 {c.id} ×{c.count}</div>) : <div style="color:#aaa">none</div>}</div>
        </div>
      </div>

      <h2>Device & Locale</h2>
      <div class="panel" style="font-family:monospace;font-size:.7rem;color:#bbb">
        {d.country && <div>Country: {COUNTRY_FLAGS[d.country] || '🌍'} {COUNTRY_NAMES[d.country] || d.country}</div>}
        {d.screen && <div>Screen: {d.screen}</div>}
        {d.language && <div>Language: {d.language}</div>}
      </div>

      <h2>Recent Activity</h2>
      <div class="panel">
        {(!d.recent || !d.recent.length) ? <div style="color:#aaa">No events</div> : d.recent.map((e, i) => {
          let data = {}; try { data = JSON.parse(e.data || '{}'); } catch (_) {}
          const typeClass = e.type === 'level_complete' ? 'complete' : e.type === 'level_death' ? 'death' : e.type === 'purchase' ? 'purchase' : e.type === 'ui_event' ? 'ui_event' : '';
          let meta = '';
          if (e.type === 'level_complete') meta = fmtMs(data.time) + ' • ☠' + (data.deaths || 0);
          else if (e.type === 'level_death') meta = '☠ ' + (data.cause || '?');
          else if (e.type === 'purchase') meta = data.id + ' • ' + (data.cost || 0) + ' ' + (data.currency || '');
          else if (e.type === 'heartbeat') meta = data.inGame ? 'in-game' : 'idle';
          else if (e.type === 'ui_event') meta = (data.action || '') + (data.meta ? ' ' + data.meta : '');
          const lvlStr = e.level != null ? 'L' + (e.level + 1) + ' ' : '';
          return (
            <div key={i} class="feed-item">
              <div class="ago">{fmtAgo(e.server_ts)}</div>
              <div class={`type ${typeClass}`}>{e.type}</div>
              <div class="who">{lvlStr}</div>
              <div class="meta">{meta}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
