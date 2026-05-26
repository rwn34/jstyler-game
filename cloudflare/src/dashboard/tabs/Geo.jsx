import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum } from '../format.js';
import { COUNTRY_FLAGS } from '../constants.js';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Geo({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.geo;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/geo', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, geo: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, geo: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;
  if (!d.countries || d.countries.length === 0) return <EmptyState message="No geo data" hint="Events need _cc field from Cloudflare" />;

  const topCountry = d.countries[0];
  const topRegions = d.regions || {};
  const topRegionEntry = topCountry && topRegions[topCountry.cc] && topRegions[topCountry.cc][0];

  const today = new Date().toISOString().slice(0, 10);
  const columns = [
    { key: 'cc', label: 'Country', sortable: true, sortType: 'string', render: r => <span>{COUNTRY_FLAGS[r.cc] || '🏳️'} {r.cc}</span> },
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
        <Card label="Top Country" val={(COUNTRY_FLAGS[topCountry.cc] || '') + ' ' + topCountry.cc} cls="live" hint={fmtNum(topCountry.players) + ' players'} />
        {topRegionEntry && <Card label="Top Region" val={topRegionEntry.region} hint={topCountry.cc + ' • ' + fmtNum(topRegionEntry.players) + ' players'} />}
      </div>

      <h2>Countries (range {range.value})</h2>
      <div class="panel scroll-x">
        <Table
          columns={columns}
          rows={d.countries}
          defaultSort={{ key: 'players', dir: 'desc' }}
          filterable
          filterPlaceholder="Filter country…"
          exportable
          exportFilename={`ndj-geo-${range.value}-${today}.csv`}
        />
      </div>

      {d.countries.slice(0, 5).map(c => {
        const regs = topRegions[c.cc];
        if (!regs || regs.length === 0) return null;
        return (
          <div key={c.cc}>
            <h3 style="cursor:pointer" onClick={() => setExpanded(expanded === c.cc ? null : c.cc)}>
              {expanded === c.cc ? '▼' : '▶'} {COUNTRY_FLAGS[c.cc] || ''} {c.cc} Regions
            </h3>
            {expanded === c.cc && (
              <div class="panel scroll-x">
                <Table columns={regionCols} rows={regs} defaultSort={{ key: 'players', dir: 'desc' }} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
