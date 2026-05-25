import { useEffect, useState } from 'preact/hooks';
import { currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs, fmtAgo, fmtDateTime, escapeHtml, truncatePid } from '../format.js';
import { LEVEL_NAMES, COUNTRY_FLAGS } from '../constants.js';
import { Card } from './Card.jsx';
import { Heatmap } from './Heatmap.jsx';
import { BarRow } from './BarRow.jsx';

export function PlayerModal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const pid = currentPlayerPid.value;

  useEffect(() => {
    if (!pid) { setData(null); return; }
    setLoading(true); setError(null);
    fetchJson('/stats/player?pid=' + encodeURIComponent(pid))
      .then(d => setData(d))
      .catch(e => setError(e))
      .finally(() => setLoading(false));
  }, [pid]);

  if (!pid) return null;

  function close() { currentPlayerPid.value = null; }

  return (
    <div class="player-modal open">
      <div class="player-modal-inner">
        <button class="close-btn" onClick={close}>✕ CLOSE</button>
        <h1 style="margin-bottom:6px">★ Player Profile</h1>
        {loading && <div style="color:#666;font-family:monospace">Loading…</div>}
        {error && <div style="color:#f44;font-family:monospace">Error: {error.message}</div>}
        {data && <PlayerDetail d={data} />}
      </div>
    </div>
  );
}

function PlayerDetail({ d }) {
  const champBadge = d.isChampion ? <span class="badge gold">★ MASTER</span> : null;
  const returnBadge = d.isReturning ? <span class="badge gold">RETURNING</span> : <span class="badge warn">TRIAL</span>;
  const flag = d.country ? (COUNTRY_FLAGS[d.country] || '🌍') + ' ' + d.country : '';

  return (
    <>
      <div style="font-family:monospace;font-size:.75rem;color:#aaa;margin-bottom:14px">
        <b style="color:#0ff;font-size:1.1rem">{escapeHtml(d.name) || '(anon)'}</b> {champBadge} {returnBadge}
        <br />PID: <code style="color:#666">{d.pid}</code> • {flag}
        <br />First seen: {fmtDateTime(d.firstSeen)} • Last seen: {fmtDateTime(d.lastSeen)} ({fmtAgo(d.lastSeen)})
      </div>

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
        <table>
          <thead><tr><th>#</th><th>Name</th><th class="num">Starts</th><th class="num">Wins</th><th class="num">Deaths</th><th class="num">Best</th><th class="num">Avg</th><th class="gold">★</th><th class="num">♦</th><th class="num">Resur.</th></tr></thead>
          <tbody>
            {d.perLevel.map((l, i) => {
              if (l.starts === 0 && l.completes === 0 && l.deaths === 0) return null;
              return (
                <tr key={i}>
                  <td>{i + 1}</td><td>{LEVEL_NAMES[i]}</td>
                  <td class="num">{fmtNum(l.starts)}</td><td class="num">{fmtNum(l.completes)}</td><td class="num">{fmtNum(l.deaths)}</td>
                  <td class="num">{fmtMs(l.bestMs)}</td><td class="num">{fmtMs(l.avgMs)}</td>
                  <td class="gold">{fmtNum(l.gold)}</td><td class="num">{fmtNum(l.silver)}</td><td class="num">{fmtNum(l.resurrects)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          <div><div class="lbl">SKILLS BOUGHT ({d.ownedSkills.length})</div>{d.ownedSkills.length ? d.ownedSkills.map(s => <div key={s.id} style="font-size:.65rem;color:#0ff">⚡ {s.id} ×{s.count}</div>) : <div style="color:#666">none</div>}</div>
          <div><div class="lbl">COSMETICS ({d.ownedCosmetics.length})</div>{d.ownedCosmetics.length ? d.ownedCosmetics.map(c => <div key={c.id} style="font-size:.65rem;color:#f0f">🎨 {c.id}</div>) : <div style="color:#666">none</div>}</div>
          <div><div class="lbl">CONSUMABLES</div>{d.ownedConsumables.length ? d.ownedConsumables.map(c => <div key={c.id} style="font-size:.65rem;color:#0f8">💊 {c.id} ×{c.count}</div>) : <div style="color:#666">none</div>}</div>
        </div>
      </div>

      <h2>Device & Locale</h2>
      <div class="panel" style="font-family:monospace;font-size:.7rem;color:#aaa">
        {d.country && <div>Country: {COUNTRY_FLAGS[d.country] || '🌍'} {d.country}</div>}
        {d.screen && <div>Screen: {d.screen}</div>}
        {d.language && <div>Language: {d.language}</div>}
      </div>

      <h2>Recent Activity</h2>
      <div class="panel">
        {(!d.recent || !d.recent.length) ? <div style="color:#666">No events</div> : d.recent.map((e, i) => {
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
