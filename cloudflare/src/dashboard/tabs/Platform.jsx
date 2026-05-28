import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { parseHash } from '../lib/url.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { COUNTRY_FLAGS, COUNTRY_NAMES } from '../constants.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { LineChart } from '../charts/LineChart.jsx';
import { Table } from '../components/Table.jsx';
import { SubTabs } from '../components/SubTabs.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const SUBTABS = [
  { id: 'geo', label: 'Geo' },
  { id: 'versions', label: 'Versions' },
  { id: 'sync', label: 'Cloud Sync' },
];

export function Platform({ force }) {
  const validSubs = SUBTABS.map(t => t.id);
  const { subTab: urlSub } = parseHash();
  const [subTab, setSubTab] = useState(validSubs.includes(urlSub) ? urlSub : 'geo');
  const [geoData, setGeoData] = useState(null);
  const [verData, setVerData] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cachedGeo = loadedAt.value.platformGeo;
    const cachedVer = loadedAt.value.platformVersions;
    const cachedSync = loadedAt.value.platformSync;

    if (!force && cachedGeo && Date.now() - cachedGeo < 240000 && cachedVer && Date.now() - cachedVer < 240000 && cachedSync && Date.now() - cachedSync < 240000) {
      return;
    }
    setErr(null);

    Promise.all([
      fetchJson('/stats/geo', { force }),
      fetchJson('/stats/appversion', { force }),
      fetchJson('/stats/sync', { force }),
    ])
      .then(([g, v, s]) => {
        setGeoData(g);
        setVerData(v);
        setSyncData(s);
        loadedAt.value = {
          ...loadedAt.value,
          platformGeo: Date.now(),
          platformVersions: Date.now(),
          platformSync: Date.now(),
        };
      })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, platformGeo: 0, platformVersions: 0, platformSync: 0 }; setErr(null); setGeoData(null); setVerData(null); setSyncData(null); }} />;
  if (!geoData || !verData || !syncData) return <LoadingPane />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <SubTabs tabs={SUBTABS} active={subTab} onChange={setSubTab} ariaLabel="Platform sub-tabs" />

      {subTab === 'geo' && (
        <div id="subpane-geo" role="tabpanel" aria-labelledby="subtab-geo">
          <GeoContent d={geoData} today={today} />
        </div>
      )}
      {subTab === 'versions' && (
        <div id="subpane-versions" role="tabpanel" aria-labelledby="subtab-versions">
          <VersionsContent d={verData} today={today} />
        </div>
      )}
      {subTab === 'sync' && (
        <div id="subpane-sync" role="tabpanel" aria-labelledby="subtab-sync">
          <SyncContent d={syncData} today={today} />
        </div>
      )}
    </>
  );
}

function GeoContent({ d, today }) {
  if (!d.countries || d.countries.length === 0) return <EmptyState message="No geo data" hint="Events need _cc field from Cloudflare" />;

  const topCountry = d.countries[0];
  const topRegions = d.regions || {};
  const topRegionEntry = topCountry && topRegions[topCountry.cc] && topRegions[topCountry.cc][0];

  const columns = [
    { key: 'cc', label: 'Country', sortable: true, sortType: 'string', render: r => <span>{COUNTRY_FLAGS[r.cc] || '🏳️'} {COUNTRY_NAMES[r.cc] || r.cc}</span> },
    { key: 'players', label: 'Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
    { key: 'sessions', label: 'Sessions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.sessions) },
    { key: 'completes', label: 'Wins', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completes) },
    { key: 'deaths', label: 'Deaths', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.deaths) },
    { key: 'completion_rate', label: 'Win%', align: 'right', sortable: true, sortType: 'number', render: r => r.completion_rate + '%' },
  ];

  const regionCols = [
    { key: 'region', label: 'Region', sortable: true, sortType: 'string' },
    { key: 'players', label: 'Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
    { key: 'sessions', label: 'Sessions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.sessions) },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Countries" val={fmtNum(d.countries.length)} hint="with activity" />
        <Card label="Top Country" val={(COUNTRY_FLAGS[topCountry.cc] || '🏳️') + ' ' + (COUNTRY_NAMES[topCountry.cc] || topCountry.cc)} cls="live" hint={fmtNum(topCountry.players) + ' players'} />
        {topRegionEntry && <Card label="Top Region" val={topRegionEntry.region} hint={topCountry.cc + ' • ' + fmtNum(topRegionEntry.players) + ' players'} />}
      </div>

      <h2>Countries (range {range.value})</h2>
      <div class="panel scroll-x">
        <Table columns={columns} rows={d.countries} defaultSort={{ key: 'players', dir: 'desc' }} exportable exportFilename={`ndj-geo-${range.value}-${today}.csv`} />
      </div>

      {topCountry && topRegions[topCountry.cc] && (
        <>
          <h2>Top Regions — {COUNTRY_NAMES[topCountry.cc] || topCountry.cc}</h2>
          <div class="panel scroll-x">
            <Table columns={regionCols} rows={topRegions[topCountry.cc]} defaultSort={{ key: 'players', dir: 'desc' }} />
          </div>
        </>
      )}
    </>
  );
}

function VersionsContent({ d, today }) {
  const dayCount = d.versions.length > 0 ? d.versions[0].series.length : 0;
  const timestamps = Array.from({ length: dayCount }, (_, i) => {
    const startOfDay = Math.floor(Date.now() / 86400000) * 86400000;
    return (startOfDay - (dayCount - 1 - i) * 86400000) / 1000;
  });

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

function SyncContent({ d, today }) {
  const dmax = Math.max(...(d.deviceDistribution || []).map(r => r.c), 1);

  const cols = [
    { key: 'username', label: 'Username', sortable: true, sortType: 'string', render: r => r.username || <span style="color:#666">—</span> },
    { key: 'keyHash', label: 'Key Hash', render: r => truncatePid(r.keyHash), className: 'pid' },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid), className: 'pid' },
    { key: 'devices', label: 'Devices', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.devices) },
    { key: 'updatedAt', label: 'Last Sync', sortable: true, sortType: 'date', render: r => fmtAgo(r.updatedAt) },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Sync Accounts" val={fmtNum(d.totalAccounts)} cls="live" hint="registered" />
        <Card label="Total Devices" val={fmtNum(d.totalDevices)} cls="gold" hint="linked" />
        <Card label="Avg Devices/Acct" val={d.avgDevicesPerAccount} />
        <Card label="Last Sync" val={d.lastSyncAt ? fmtAgo(d.lastSyncAt) : '—'} cls="live" hint="across all accounts" />
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
