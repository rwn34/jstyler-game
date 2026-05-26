import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, escapeHtml } from '../format.js';
import { Card } from '../components/Card.jsx';
import { LineChart } from '../charts/LineChart.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function AppVersion({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.appversion;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/appversion', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, appversion: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, appversion: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const dayCount = d.versions.length > 0 ? d.versions[0].series.length : 0;
  const timestamps = Array.from({ length: dayCount }, (_, i) => {
    const startOfDay = Math.floor(Date.now() / 86400000) * 86400000;
    return (startOfDay - (dayCount - 1 - i) * 86400000) / 1000;
  });

  const today = new Date().toISOString().slice(0, 10);
  const cols = [
    { key: 'version', label: 'Version', sortable: true, sortType: 'string', render: r => <span class="badge">{escapeHtml(r.version)}</span> },
    { key: 'events', label: 'Events', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.events) },
    { key: 'players', label: 'Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
    { key: 'pct', label: 'Share', align: 'right', sortable: true, sortType: 'number', render: r => r.pct + '%' },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Total Events" val={fmtNum(d.totalEvents)} hint="in range" />
        <Card label="Tracked Versions" val={fmtNum(d.versions.length)} cls="live" />
      </div>

      <h2>Version Breakdown</h2>
      <div class="panel scroll-x">
        <Table columns={cols} rows={d.versions} defaultSort={{ key: 'events', dir: 'desc' }} exportable exportFilename={`ndj-versions-${range.value}-${today}.csv`} />
      </div>

      {d.versions.length > 0 && dayCount > 1 && (
        <>
          <h2>Version Adoption Over Time</h2>
          <div class="panel">
            <LineChart
              series={[timestamps, ...d.versions.slice(0, 5).map(v => v.series)]}
              labels={d.versions.slice(0, 5).map(v => v.version)}
              colorPrimary="#0ff"
              height={160}
            />
            <div style="font-size:.55rem;color:#888;margin-top:4px;font-family:monospace;display:flex;gap:14px;flex-wrap:wrap">
              {d.versions.slice(0, 5).map((v, i) => {
                const colors = ['#0ff', '#ffd700', '#f0f', '#0f8', '#fa0'];
                return <span key={v.version} style={{ color: colors[i % colors.length] }}>— {escapeHtml(v.version)}</span>;
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
