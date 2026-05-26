import { useState, useEffect, useRef } from 'preact/hooks';
import { currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'wins', label: 'Wins', types: ['level_complete'] },
  { id: 'deaths', label: 'Deaths', types: ['level_death'] },
  { id: 'purchases', label: 'Purchases', types: ['purchase'] },
  { id: 'ui', label: 'UI Events', types: ['ui_event'] },
  { id: 'sessions', label: 'Sessions', types: ['session_start', 'heartbeat'] },
];

const MAX_EVENTS = 200;

export function Feed({ force }) {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({});
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState(new Set(['all']));
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false); // green=streaming, red=disconnected, grey=paused
  const sinceRef = useRef(Date.now() - 10000);
  const timerRef = useRef(null);
  const initialLoad = useRef(true);

  // Initial load: get last 100 events from existing endpoint
  useEffect(() => {
    fetchJson('/stats/feed', { force })
      .then(data => {
        setEvents(data.events || []);
        setSummary(data.summary || {});
        if (data.events && data.events.length > 0) {
          sinceRef.current = Math.max(...data.events.map(e => e.server_ts));
        }
        initialLoad.current = false;
        setConnected(true);
      })
      .catch(e => { setErr(e); setConnected(false); });
  }, []);

  // Polling loop: every 2s, fetch new events via /stats/feed/stream?since=
  useEffect(() => {
    if (initialLoad.current) return;

    function poll() {
      if (paused) return;
      fetch('/stats/feed/stream?since=' + sinceRef.current + '&limit=50', { credentials: 'same-origin' })
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(j => {
          if (!j.ok) return;
          const newEvents = j.data.events || [];
          if (newEvents.length > 0) {
            sinceRef.current = j.data.nextSince;
            setEvents(prev => {
              const merged = [...newEvents.reverse(), ...prev];
              return merged.slice(0, MAX_EVENTS);
            });
          }
          setConnected(true);
        })
        .catch(() => { setConnected(false); });
    }

    timerRef.current = setInterval(poll, 2000);
    return () => clearInterval(timerRef.current);
  }, [paused, initialLoad.current]);

  function toggleFilter(id) {
    if (id === 'all') {
      setFilters(new Set(['all']));
    } else {
      const next = new Set(filters);
      next.delete('all');
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add('all');
      setFilters(next);
    }
  }

  function getVisibleEvents() {
    if (filters.has('all')) return events;
    const allowedTypes = new Set();
    for (const chip of FILTER_CHIPS) {
      if (chip.types && filters.has(chip.id)) {
        for (const t of chip.types) allowedTypes.add(t);
      }
    }
    return events.filter(e => allowedTypes.has(e.type));
  }

  if (err && events.length === 0) return <ErrorState error={err} onRetry={() => { setErr(null); }} />;
  if (initialLoad.current) return <LoadingPane />;

  const types = ['session_start', 'heartbeat', 'level_start', 'level_complete', 'level_death', 'purchase', 'ui_event'];
  const totalLast5 = types.reduce((sum, t) => sum + (summary[t] || 0), 0);
  const visible = getVisibleEvents();

  const connCls = paused ? 'conn-grey' : connected ? 'conn-green' : 'conn-red';
  const connLabel = paused ? 'Paused' : connected ? 'Live' : 'Disconnected';

  return (
    <>
      <div class="grid">
        <Card label="Events/min (last 5m)" val={summary.eventsPerMin || fmtNum(Math.round(totalLast5 / 5))} cls="live" />
        <Card label="Total (5m)" val={fmtNum(totalLast5)} />
        <Card label="Wins (5m)" val={fmtNum(summary.level_complete || 0)} cls="live" />
        <Card label="Deaths (5m)" val={fmtNum(summary.level_death || 0)} cls="warn" />
        <Card label="Purchases (5m)" val={fmtNum(summary.purchase || 0)} cls="gold" />
        <Card label="UI Clicks (5m)" val={fmtNum(summary.ui_event || 0)} />
      </div>

      <div class="feed-controls">
        <div class="filter-chips">
          {FILTER_CHIPS.map(c => (
            <button key={c.id} class={`chip${filters.has(c.id) ? ' active' : ''}`} onClick={() => toggleFilter(c.id)} aria-pressed={filters.has(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div class="feed-actions">
          <span class={`conn-dot ${connCls}`} aria-hidden="true">●</span>
          <span class="conn-label">{connLabel}</span>
          <button class="chip" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Resume live feed' : 'Pause live feed'}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      <div class="panel">
        {visible.length === 0 ? <div style="color:#666">No events</div> : visible.map((e, i) => {
          let data = {}; try { data = JSON.parse(e.data || '{}'); } catch (_) {}
          const typeClass = e.type === 'level_complete' ? 'complete' : e.type === 'level_death' ? 'death' : e.type === 'purchase' ? 'purchase' : e.type === 'ui_event' ? 'ui_event' : '';
          let meta = '';
          if (e.type === 'level_complete') meta = fmtMs(data.time) + ' • ☠' + (data.deaths || 0);
          else if (e.type === 'level_death') meta = '☠ ' + (data.cause || '?');
          else if (e.type === 'purchase') meta = data.id + ' • ' + (data.cost || 0) + ' ' + (data.currency || '');
          else if (e.type === 'heartbeat') meta = data.inGame ? 'in-game' : 'idle';
          else if (e.type === 'ui_event') meta = (data.action || '') + (data.meta ? ' ' + data.meta : '');
          const lvlStr = e.level != null ? 'L' + (e.level + 1) + ' ' : '';
          // Determine if this is a "new" event (for flash animation)
          const isNew = i < 5 && !paused;
          return (
            <div key={e.id || (e.server_ts + '-' + i)} class={`feed-item${isNew ? ' feed-flash' : ''}`}>
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
