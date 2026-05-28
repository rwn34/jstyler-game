import { useState, useEffect, useRef } from 'preact/hooks';
import { currentPlayerPid, currentTab, currentFilters, range } from '../state.js';
import { fetchJson, postJson } from '../api.js';
import { parseHash, writeHash } from '../lib/url.js';
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
  const validSubs = SUBTABS.map(t => t.id);
  const { subTab: urlSub } = parseHash();
  const [subTab, setSubTab] = useState(validSubs.includes(urlSub) ? urlSub : 'alerts');

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
  const [showMuted, setShowMuted] = useState(false);
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

  async function ackAlert(id) {
    setD(prev => {
      if (!prev) return prev;
      return { ...prev, alerts: prev.alerts.map(a => a.id === id ? { ...a, status: 'acked', acked_at: Date.now() } : a) };
    });
    try { await postJson('/admin/alerts/ack', { alert_id: id }); }
    catch (e) { setErr(e); load(); }
  }

  async function unackAlert(id) {
    setD(prev => {
      if (!prev) return prev;
      return { ...prev, alerts: prev.alerts.map(a => a.id === id ? { ...a, status: 'open', acked_at: null } : a) };
    });
    try { await postJson('/admin/alerts/unack', { alert_id: id }); }
    catch (e) { setErr(e); load(); }
  }

  async function muteAlert(id, days) {
    setD(prev => {
      if (!prev) return prev;
      const muteUntil = Date.now() + days * 86400000;
      return { ...prev, alerts: prev.alerts.map(a => a.id === id ? { ...a, status: 'muted', mute_until: muteUntil } : a) };
    });
    try { await postJson('/admin/alerts/mute', { alert_id: id, days }); }
    catch (e) { setErr(e); load(); }
  }

  function jumpToSource(a) {
    const h = parseHash();
    if (a.type === 'completion_rate_drop' || a.type === 'death_rate_spike' || a.type === 'avg_time_slowdown') {
      currentFilters.value = { ...currentFilters.value, level: String(a.level) };
      writeHash('levels', '', range.value, currentPlayerPid.value, currentSegment.value, currentFilters.value.cc, String(a.level), currentFilters.value.version, currentFilters.value.named);
      currentTab.value = 'levels';
    } else if (a.type === 'dau_drop' || a.type === 'verified_pct_drop') {
      writeHash('overview', '', range.value, currentPlayerPid.value, currentSegment.value, currentFilters.value.cc, currentFilters.value.level, currentFilters.value.version, currentFilters.value.named);
      currentTab.value = 'overview';
    } else {
      writeHash('overview', '', range.value, currentPlayerPid.value, currentSegment.value, currentFilters.value.cc, currentFilters.value.level, currentFilters.value.version, currentFilters.value.named);
      currentTab.value = 'overview';
    }
  }

  if (err) return <ErrorState error={err} onRetry={load} />;
  if (!d) return <LoadingPane />;

  const allAlerts = d.alerts || [];
  const visible = allAlerts.filter(a => a.status !== 'muted');
  const muted = allAlerts.filter(a => a.status === 'muted');
  const display = showMuted ? [...visible, ...muted] : visible;

  // Sort: open first, then acked, then muted
  const statusOrder = { open: 0, acked: 1, muted: 2 };
  display.sort((a, b) => {
    const so = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
    if (so !== 0) return so;
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] || 0) - (sev[b.severity] || 0);
  });

  const high = visible.filter(a => a.severity === 'high');
  const medium = visible.filter(a => a.severity === 'medium');
  const low = visible.filter(a => a.severity === 'low');

  return (
    <div id="subpane-alerts" role="tabpanel" aria-labelledby="subtab-alerts">
      <div class="grid">
        <Card label="High" val={high.length} cls={high.length > 0 ? 'bad' : ''} />
        <Card label="Medium" val={medium.length} cls={medium.length > 0 ? 'warn' : ''} />
        <Card label="Low" val={low.length} />
        <Card label="Last Check" val={d.computedAt ? fmtAgo(d.computedAt) : '—'} />
      </div>

      {muted.length > 0 && (
        <div style="margin:12px 0">
          <button class="chip" onClick={() => setShowMuted(v => !v)}>
            {showMuted ? '🔔 Hide muted' : `🔕 Show ${muted.length} muted`}
          </button>
        </div>
      )}

      {display.length === 0 ? (
        <div class="empty-state" style="margin-top:24px">
          <div class="empty-msg">✅ All systems normal — no anomalies detected.</div>
          <div class="empty-hint">Checks last 7 days vs prior 28-day baseline</div>
        </div>
      ) : (
        <div class="alerts-list">
          {display.map(a => (
            <div key={a.id} class={`alert-item sev-${a.severity} ${a.status === 'acked' ? 'acked' : ''} ${a.status === 'muted' ? 'muted' : ''}`}>
              <span class="alert-icon">{SEV_ICON[a.severity]}</span>
              <div class="alert-body">
                <div class="alert-msg">{a.message}</div>
                <div class="alert-meta">
                  {a.level != null && <span class="badge">L{a.level + 1}</span>}
                  <span>Recent: {a.value}%</span>
                  <span>Baseline: {a.baseline}%</span>
                  {a.sigma > 0 && <span>{a.sigma}σ</span>}
                  <span class="alert-since">since {a.since}</span>
                  {a.status === 'acked' && a.acked_at && <span class="ack-caption">Acked {fmtAgo(a.acked_at)}</span>}
                </div>
                <div class="alert-actions" style="display:flex;gap:6px;margin-top:6px">
                  {a.status !== 'acked' && a.status !== 'muted' && (
                    <>
                      <button class="btn-small" onClick={() => ackAlert(a.id)}>✓ Ack</button>
                      <button class="btn-small" onClick={() => muteAlert(a.id, 1)}>🔕 Mute 1h</button>
                      <button class="btn-small" onClick={() => muteAlert(a.id, 7)}>🔕 Mute 7d</button>
                    </>
                  )}
                  {a.status === 'acked' && (
                    <button class="btn-small" onClick={() => unackAlert(a.id)}>↩ Unack</button>
                  )}
                  <button class="btn-small" onClick={() => jumpToSource(a)}>🔗 Jump</button>
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
  }, [paused, connected]);

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
