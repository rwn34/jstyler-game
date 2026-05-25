import { useState, useEffect } from 'preact/hooks';
import { loadedAt, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Feed({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.feed;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/feed', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, feed: Date.now() }; })
      .catch(setErr);
  }, [force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  const s = d.summary || {};
  const types = ['session_start', 'heartbeat', 'level_start', 'level_complete', 'level_death', 'purchase', 'ui_event'];
  const totalLast5 = types.reduce((sum, t) => sum + (s[t] || 0), 0);

  return (
    <>
      <div class="grid">
        <Card label="Events/min (last 5m)" val={d.eventsPerMin} cls="live" />
        <Card label="Total (5m)" val={fmtNum(totalLast5)} />
        <Card label="Wins (5m)" val={fmtNum(s.level_complete || 0)} cls="live" />
        <Card label="Deaths (5m)" val={fmtNum(s.level_death || 0)} cls="warn" />
        <Card label="Purchases (5m)" val={fmtNum(s.purchase || 0)} cls="gold" />
        <Card label="UI Clicks (5m)" val={fmtNum(s.ui_event || 0)} />
      </div>

      <h2>Recent Events (last 100)</h2>
      <div class="panel">
        {!d.events.length ? <div style="color:#666">No events</div> : d.events.map((e, i) => {
          let data = {}; try { data = JSON.parse(e.data || '{}'); } catch (_) {}
          const typeClass = e.type === 'level_complete' ? 'complete' : e.type === 'level_death' ? 'death' : e.type === 'purchase' ? 'purchase' : e.type === 'ui_event' ? 'ui_event' : '';
          let meta = '';
          if (e.type === 'level_complete') meta = fmtMs(data.time) + ' • ☠' + (data.deaths || 0);
          else if (e.type === 'level_death') meta = '☠ ' + (data.cause || '?');
          else if (e.type === 'purchase') meta = data.id + ' • ' + (data.cost || 0) + ' ' + (data.currency || '');
          else if (e.type === 'heartbeat') meta = data.inGame ? 'in-game' : 'idle';
          else if (e.type === 'ui_event') meta = (data.action || '') + (data.meta ? ' ' + data.meta : '');
          const lvlStr = e.level != null ? 'L' + (e.level + 1) + ' ' : '';
          const verif = e.verified ? '' : ' ';
          return (
            <div key={i} class="feed-item">
              <div class="ago">{fmtAgo(e.server_ts)}</div>
              <div class={`type ${typeClass}`}>{e.type}</div>
              <div class="who">
                <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = e.pid; }} style="color:#aaa;text-decoration:none">
                  {lvlStr}{escapeHtml(e.name) || truncatePid(e.pid)}
                </a>
                {!e.verified && <span class="badge bad" style="margin-left:4px">unv</span>}
              </div>
              <div class="meta">{meta}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
