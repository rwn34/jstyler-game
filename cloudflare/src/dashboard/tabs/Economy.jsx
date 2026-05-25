import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../charts/LineChart.jsx';
import { AreaChart } from '../charts/AreaChart.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

function buildTimestamps(dayCount) {
  const now = Date.now();
  const startOfDay = Math.floor(now / 86400000) * 86400000;
  return Array.from({ length: dayCount }, (_, i) => (startOfDay - (dayCount - 1 - i) * 86400000) / 1000);
}

export function Economy({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.economy;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/economy', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, economy: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  const t = d.totals;
  const ts = d.timeseries;
  const dayCount = ts.goldEarn.length;
  const timestamps = buildTimestamps(dayCount);

  return (
    <>
      <div class="grid">
        <Card label="★ Gold Earned" val={fmtNum(t.goldEarned)} cls="gold" />
        <Card label="★ Gold Spent" val={fmtNum(t.goldSpent)} />
        <Card label="★ Circulating" val={fmtNum(t.circulatingGold)} cls="live" hint="in player wallets" />
        <Card label="Avg ★/Session" val={t.avgGoldPerSession} cls="gold" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="♦ Silver Earned" val={fmtNum(t.silverEarned)} />
        <Card label="♦ Silver Spent" val={fmtNum(t.silverSpent)} />
        <Card label="♦ Circulating" val={fmtNum(t.circulatingSilver)} cls="live" />
        <Card label="Avg ♦/Session" val={t.avgSilverPerSession} />
      </div>

      <h2>★ Gold Time-Series</h2>
      <div class="panel">
        <LineChart series={[timestamps, ts.goldEarn, ts.goldSpent]} labels={['earned', 'spent']} colorPrimary="#ffd700" colorSecondary="#f44" />
      </div>

      <h2>★ Gold Circulation (running balance)</h2>
      <div class="panel">
        <AreaChart series={[timestamps, ts.goldCirc]} color="#ffd700" />
      </div>

      <h2>♦ Silver Time-Series</h2>
      <div class="panel">
        <LineChart series={[timestamps, ts.silverEarn, ts.silverSpent]} labels={['earned', 'spent']} colorPrimary="#0ff" colorSecondary="#f44" />
      </div>

      <h2>♦ Silver Circulation</h2>
      <div class="panel">
        <AreaChart series={[timestamps, ts.silverCirc]} color="#0ff" />
      </div>

      <h2>Purchases by Category</h2>
      <div class="panel scroll-x"><table><thead><tr><th>Kind</th><th>Category</th><th class="num">Buys</th><th class="num">Total Spent</th></tr></thead><tbody>
        {(d.byCategory || []).map((r, i) => <tr key={i}><td><span class="badge">{r.kind || '?'}</span></td><td>{r.cat || '—'}</td><td class="num">{fmtNum(r.buys)}</td><td class="num">{fmtNum(Math.round(r.total_spent || 0))}</td></tr>)}
      </tbody></table></div>

      <h2>Top Items (by buys)</h2>
      <div class="panel scroll-x"><table><thead><tr><th>Kind</th><th>Item</th><th>Currency</th><th class="num">Buys</th><th class="num">Buyers</th><th class="num">Total Spent</th></tr></thead><tbody>
        {(d.topItems || []).map((r, i) => <tr key={i}><td><span class="badge">{r.kind || '?'}</span></td><td>{r.id || '?'}</td><td>{r.currency || '?'}</td><td class="num">{fmtNum(r.buys)}</td><td class="num">{fmtNum(r.buyers)}</td><td class={r.currency === 'gold' ? 'gold' : 'num'}>{fmtNum(Math.round(r.total_spent || 0))}</td></tr>)}
      </tbody></table></div>

      <h2>Top Spenders</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th>Currency</th><th class="num">Buys</th><th class="num">Total Spent</th></tr></thead><tbody>
        {(d.topSpenders || []).map((p, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td><a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = p.pid; }} style="color:#0ff;text-decoration:none">{escapeHtml(p.name) || '(anon)'}</a></td>
            <td class="pid">{truncatePid(p.pid)}</td>
            <td>{p.currency || '?'}</td>
            <td class="num">{fmtNum(p.buys)}</td>
            <td class={p.currency === 'gold' ? 'gold' : 'num'}>{fmtNum(Math.round(p.total_spent || 0))}</td>
          </tr>
        ))}
      </tbody></table></div>
    </>
  );
}
