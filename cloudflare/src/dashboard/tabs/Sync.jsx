import { useState, useEffect } from 'preact/hooks';
import { loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtAgo, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Sync({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.sync;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/sync', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, sync: Date.now() }; })
      .catch(setErr);
  }, [force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, sync: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const dmax = Math.max(...(d.deviceDistribution || []).map(r => r.c), 1);
  const today = new Date().toISOString().slice(0, 10);

  const cols = [
    { key: 'keyHash', label: 'Key Hash', render: r => truncatePid(r.keyHash), className: 'pid' },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid), className: 'pid' },
    { key: 'devices', label: 'Devices', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.devices) },
    { key: 'updatedAt', label: 'Last Updated', sortable: true, sortType: 'date', render: r => fmtAgo(r.updatedAt) },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Sync Accounts" val={fmtNum(d.totalAccounts)} cls="live" hint="registered" />
        <Card label="Total Devices" val={fmtNum(d.totalDevices)} cls="gold" hint="linked" />
        <Card label="Avg Devices/Acct" val={d.avgDevicesPerAccount} />
      </div>

      <h2>Device Distribution</h2>
      <div class="panel">
        {(!d.deviceDistribution || !d.deviceDistribution.length) ? <div style="color:#666">No data</div> : d.deviceDistribution.map(r => (
          <BarRow key={r.dcount} label={(r.dcount || 0) + ' device' + (r.dcount == 1 ? '' : 's')} value={r.c} max={dmax} />
        ))}
      </div>

      <h2>Recent Accounts</h2>
      <div class="panel scroll-x">
        <Table columns={cols} rows={d.items || []} defaultSort={{ key: 'updatedAt', dir: 'desc' }} exportable exportFilename={`ndj-sync-accounts-${today}.csv`} />
      </div>
    </>
  );
}
