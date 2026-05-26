import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Engagement({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.engagement;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/ui', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, engagement: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, engagement: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const displayTotal = (d.displayMode || []).reduce((s, r) => s + r.c, 0);

  const fmap = {};
  (d.installFunnel || []).forEach(r => { fmap[r.action] = r.c; });
  const stages = [
    { k: 'pwa_prompt_shown', label: '1. Prompted', cls: '' },
    { k: 'pwa_install_accepted', label: '2. Accepted', cls: 'green' },
    { k: 'pwa_install_dismissed', label: '2. Dismissed', cls: 'warn' },
    { k: 'pwa_appinstalled', label: '3. Installed (browser confirmed)', cls: 'gold' },
  ];
  const fmax = Math.max(...stages.map(s => fmap[s.k] || 0), 1);

  const clickRows = (d.clicks || []).filter(r => r.action && !r.action.startsWith('pwa_') && r.action !== 'store_tab');
  const cmax = Math.max(...clickRows.map(r => r.c), 1);
  const stRows = d.storeTabs || [];
  const smax = Math.max(...stRows.map(r => r.c), 1);

  return (
    <>
      <h2>Display Mode</h2>
      <div class="panel"><div class="grid">
        {(d.displayMode || []).map(r => {
          const pct = displayTotal > 0 ? Math.round(r.c / displayTotal * 100) : 0;
          return <Card key={r.display} label={(r.display || 'unknown').toUpperCase()} val={fmtNum(r.players) + ' players'} cls={r.display === 'standalone' ? 'gold' : ''} hint={pct + '% of sessions (' + fmtNum(r.c) + ')'} />;
        })}
        {(!d.displayMode || !d.displayMode.length) && <div style="color:#666;padding:14px">No data yet</div>}
      </div></div>

      <h2>PWA Support</h2>
      <div class="panel"><div class="grid">
        {(d.pwaSupport || []).map(r => <Card key={r.pwa} label={(r.pwa || 'unknown').toUpperCase()} val={fmtNum(r.players) + ' players'} cls={r.pwa === 'supported' ? 'green' : 'warn'} hint={fmtNum(r.c) + ' sessions'} />)}
        {(!d.pwaSupport || !d.pwaSupport.length) && <div style="color:#666;padding:14px">No data yet</div>}
      </div></div>

      <h2>PWA Install Funnel</h2>
      <div class="panel">
        {stages.map(s => <BarRow key={s.k} label={s.label} value={fmap[s.k] || 0} max={fmax} cls={s.cls} />)}
      </div>

      <h2>Button Click Counts</h2>
      <div class="panel">
        {!clickRows.length ? <div style="color:#666">No data yet</div> : clickRows.map(r => (
          <BarRow key={r.action} label={(r.action || '?').replace('_clicked', '').replace(/_/g, ' ')} value={r.c} max={cmax} countText={fmtNum(r.c) + ' (' + fmtNum(r.players) + ' p)'} />
        ))}
      </div>

      <h2>Store Tab Popularity</h2>
      <div class="panel">
        {!stRows.length ? <div style="color:#666">No data yet</div> : stRows.map(r => (
          <BarRow key={r.tab} label={(r.tab || '?').toUpperCase()} value={r.c} max={smax} cls="gold" />
        ))}
      </div>
    </>
  );
}
