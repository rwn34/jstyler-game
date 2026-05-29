import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentPlayerPid, currentFilters } from '../state.js';
import { fetchWithCompare, computeDelta } from '../lib/compare.js';
import { fmtNum, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../charts/LineChart.jsx';
import { AreaChart } from '../charts/AreaChart.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

function buildTimestamps(dayCount) {
  const now = Date.now();
  const startOfDay = Math.floor(now / 86400000) * 86400000;
  return Array.from({ length: dayCount }, (_, i) => (startOfDay - (dayCount - 1 - i) * 86400000) / 1000);
}

export function Economy({ force }) {
  const [d, setD] = useState(null);
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.economy;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchWithCompare('/stats/economy', { force })
      .then(r => { setD(r.current); setPrev(r.previous); loadedAt.value = { ...loadedAt.value, economy: Date.now() }; })
      .catch(setErr);
  }, [range.value, force, currentFilters.value]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, economy: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const t = d.totals;
  const pt = prev ? prev.totals : null;
  const ts = d.timeseries;
  const dayCount = ts.goldEarn.length;
  const timestamps = buildTimestamps(dayCount);
  const today = new Date().toISOString().slice(0, 10);

  const catCols = [
    { key: 'kind', label: 'Kind', render: r => <span class="badge">{r.kind || '?'}</span> },
    { key: 'cat', label: 'Category', render: r => r.cat || '—' },
    { key: 'buys', label: 'Buys', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.buys) },
    { key: 'total_spent', label: 'Total Spent', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(Math.round(r.total_spent || 0)) },
  ];

  const itemCols = [
    { key: 'kind', label: 'Kind', render: r => <span class="badge">{r.kind || '?'}</span> },
    { key: 'id', label: 'Item', render: r => r.id || '?' },
    { key: 'currency', label: 'Currency' },
    { key: 'buys', label: 'Buys', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.buys) },
    { key: 'buyers', label: 'Buyers', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.buyers) },
    { key: 'total_spent', label: 'Total Spent', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(Math.round(r.total_spent || 0)), className: 'num' },
  ];

  const spenderCols = [
    { key: '_i', label: '#', render: (r, i) => i + 1 },
    { key: 'name', label: 'Name', render: r => <a href="javascript:void(0)" onClick={() => { currentPlayerPid.value = r.pid; }} style="color:#0ff;text-decoration:none">{escapeHtml(r.name) || '(anon)'}</a> },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid), className: 'pid' },
    { key: 'currency', label: 'Currency' },
    { key: 'buys', label: 'Buys', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.buys) },
    { key: 'total_spent', label: 'Total Spent', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(Math.round(r.total_spent || 0)) },
  ];

  return (
    <>
      <div class="grid">
        <Card label="★ Gold Earned" val={fmtNum(t.goldEarned)} cls="gold" delta={pt ? computeDelta(t.goldEarned, pt.goldEarned) : null} />
        <Card label="★ Gold Spent" val={fmtNum(t.goldSpent)} delta={pt ? computeDelta(t.goldSpent, pt.goldSpent) : null} />
        <Card label="★ Circulating" val={fmtNum(t.circulatingGold)} cls="live" hint="in player wallets" />
        <Card label="Avg ★/Session" val={t.avgGoldPerSession} cls="gold" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="♦ Silver Earned" val={fmtNum(t.silverEarned)} delta={pt ? computeDelta(t.silverEarned, pt.silverEarned) : null} />
        <Card label="♦ Silver Spent" val={fmtNum(t.silverSpent)} delta={pt ? computeDelta(t.silverSpent, pt.silverSpent) : null} />
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
      <div class="panel scroll-x">
        <Table columns={catCols} rows={d.byCategory || []} defaultSort={{ key: 'buys', dir: 'desc' }} exportable exportFilename={`ndj-economy-category-${range.value}-${today}.csv`} />
      </div>

      <h2>Top Items (by buys)</h2>
      <div class="panel scroll-x">
        <Table columns={itemCols} rows={d.topItems || []} defaultSort={{ key: 'buys', dir: 'desc' }} filterable exportable exportFilename={`ndj-economy-items-${range.value}-${today}.csv`} />
      </div>

      <h2>Top Spenders</h2>
      <div class="panel scroll-x">
        <Table columns={spenderCols} rows={d.topSpenders || []} defaultSort={{ key: 'total_spent', dir: 'desc' }} filterable exportable exportFilename={`ndj-economy-spenders-${range.value}-${today}.csv`} />
      </div>
    </>
  );
}
