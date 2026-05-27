import { useState, useEffect, useRef } from 'preact/hooks';
import { currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { SubTabs } from '../components/SubTabs.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const SUBTABS = [
  { id: 'alerts', label: '⚠ Alerts' },
  { id: 'feed', label: 'Live Feed' },
];

const SEV_ICON = { high: '🔴', medium: '🟡', low: '🔵' };
const SEV_CLS = { high: 'bad', medium: 'warn', low: '' };

const FEED_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'wins', label: 'Wins', types: ['level_complete'] },
  { id: 'deaths', label: 'Deaths', types: ['level_death'] },
  { id: 'purchases', label: 'Purchases', types: ['purchase'] },
  { id: 'ui', label: 'UI Events', types: ['ui_event'] },
  { id: 'sessions', label: 'Sessions', types: ['session_start', 'heartbeat'] },
];

const MAX_EVENTS = 200;

export function Live() {
  const [subTab, setSubTab] = useState('alerts');

  return (
    <>
      <SubTabs tabs={SUBTABS} active={subTab} onChange={setSubTab} ariaLabel="Live sub-tabs" />
      {subTab === 'alerts' && <AlertsPane />}
      {subTab === 'feed' && <FeedPane />}
    </>
  );
}

function AlertsPane() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const timer = useRef(null);

  function load() {
    setErr(null);
    fetchJson('/stats/anomalies', { force: true })
      .then(setD)
      .catch(setErr);
  }

  useEffect(() => {
    load();
    timer.current = setInterval(load, 60000);
    return () => clearInterval(timer.current);
  }, []);

  if (err) return <ErrorState error={err} onRetry={load} />;
  if (!d) return <LoadingPane />;

  const alerts = d.alerts || [];
  const high = alerts.filter(a => a.severity === 'high');
  const medium = alerts.filter(a => a.severity === 'medium');
  const low = alerts.filter(a => a.severity === 'low');

  return (
    <div id="subpane-alerts" role="tabpanel" aria-labelledby="subtab-alerts">
      <div class="grid">
        <Card label="High" val={high.length} cls={high.length > 0 ? 'bad' : ''} />
        <Card label="Medium" val={medium.length} cls={medium.length > 0 ? 'warn' : ''} />
        <Card label="Low" val={low.length} />
        <Card label="Last Check" val={d.computedAt ? fmtAgo(d.computedAt) : '—'} />
      </div>

      {alerts.length === 0 ? (
        <div class="empty-state" style="margin-top:24px">
          <div class="empty-msg">✅ All systems normal — no anomalies detected.</div>
          <div class="empty-hint">Checks last 7 days vs prior 28-day baseline</div>
        </div>
      ) : (
        <div class="alerts-list">
          {alerts.map(a => (
            <div key={a.id} class={`alert-item sev-${a.severity}`}>
              <span class="alert-icon">{SEV_ICON[a.severity]}</span>
              <div class="alert-body">
                <div class="alert-msg">{a.message}</div>
                <div class="alert-meta">
                  {a.level != null && <span class="badge">L{a.level + 1}</span>}
                  <span>Recent: {a.value}%</span>
                  <span>Baseline: {a.baseline}%</span>
                  {a.sigma > 0 && <span>{a.sigma}σ</span>}
                  <span class="alert-since">since {a.since}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedPane() {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({});
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState(new Set(['all']));
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const sinceRef = useRef(Date.now() - 10000);
  const timerRef = useRef(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    fetchJson('/stats/feed', {})
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
        .catch(() => setConnected(false));
    }

    timerRef.current = setInterval(poll, 2000);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const filtered = events.filter(e => {
    if (filters.has('all')) return true;
    for (const chip of FEED_CHIPS) {
      if (filters.has(chip.id) && chip.types && chip.types.includes(e.type)) return true;
    }
    return false;
  });

  function toggleFilter(id) {
    const next = new Set(filters);
    if (id === 'all') {
      next.clear();
      next.add('all');
    } else {
      next.delete('all');
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) next.add('all');
    }
    setFilters(next);
  }

  if (err) return <ErrorState error={err} onRetry={() => { setErr(null); initialLoad.current = true; setEvents([]); }} />;

  return (
    <div id="subpane-feed" role="tabpanel" aria-labelledby="subtab-feed">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <span class={`live-dot${connected ? '' : ' dead'}${paused ? ' paused' : ''}`} title={paused ? 'Paused' : connected ? 'Live' : 'Disconnected'} />
        <span style="font-size:.6rem;color:#888;font-family:monospace">{paused ? 'PAUSED' : connected ? 'LIVE' : 'OFFLINE'}</span>
        <button class="pause-btn" onClick={() => setPaused(p => !p)} aria-label={paused ? 'Resume feed' : 'Pause feed'}>
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <span style="flex:1" />
        <span style="font-size:.6rem;color:#666;font-family:monospace">{fmtNum(events.length)} events • {fmtNum(filtered.length)} shown</span>
      </div>

      <div class="feed-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        {FEED_CHIPS.map(c => (
          <button
            key={c.id}
            class={`chip${filters.has(c.id) ? ' active' : ''}`}
            onClick={() => toggleFilter(c.id)}
            aria-pressed={filters.has(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div class="feed-events">
        {filtered.length === 0 ? (
          <div style="color:#666;padding:20px;text-align:center;font-size:.7rem">No events match the current filter.</div>
        ) : (
          filtered.map(e => (
            <div key={e.id} class={`feed-row type-${e.type}`}>
              <span class="feed-time">{fmtAgo(e.server_ts)}</span>
              <span class={`feed-badge ${e.type}`}>{e.type}</span>
              <span class="feed-name">
                <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = e.pid; }} style="color:#0ff;text-decoration:none">{escapeHtml(e.name) || '(anon)'}</a>
              </span>
              <span class="feed-pid">{truncatePid(e.pid)}</span>
              <span class="feed-level">{e.level != null ? 'L' + (e.level + 1) : ''}</span>
              <span class="feed-detail">{e.detail || ''}</span>
              <span class="feed-meta">{e.meta || ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
