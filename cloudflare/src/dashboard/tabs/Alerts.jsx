import { useState, useEffect, useRef } from 'preact/hooks';
import { fetchJson } from '../api.js';
import { Card } from '../components/Card.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';
import { fmtAgo } from '../format.js';

const SEV_ICON = { high: '🔴', medium: '🟡', low: '🔵' };
const SEV_CLS = { high: 'bad', medium: 'warn', low: '' };

export function Alerts() {
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
    <>
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
    </>
  );
}
