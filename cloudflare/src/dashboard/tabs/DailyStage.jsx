import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { FilterIgnoredNotice } from '../components/FilterIgnoredNotice.jsx';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function DailyStage({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.dailystage;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/dailystage', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, dailystage: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, dailystage: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const today = new Date().toISOString().slice(0, 10);

  const byDayCols = [
    { key: 'day', label: 'Day', render: r => 'Day ' + (r.day != null ? r.day : '?') },
    { key: 'starts', label: 'Attempts', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.starts) },
    { key: 'completes', label: 'Completions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completes) },
    { key: 'players', label: 'Unique Players', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.players) },
  ];

  const byDiffCols = [
    { key: 'diff', label: 'Difficulty', render: r => <span class={`badge ${r.diff === 'HARD' ? 'bad' : r.diff === 'MODERATE' ? 'warn' : ''}`}>{r.diff || '?'}</span> },
    { key: 'starts', label: 'Starts', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.starts) },
    { key: 'completes', label: 'Completions', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completes) },
    { key: '_rate', label: 'Rate', align: 'right', sortable: true, sortType: 'number', render: r => { const rate = r.starts > 0 ? Math.round((r.completes / r.starts) * 1000) / 10 : 0; return rate + '%'; } },
  ];

  return (
    <>
      <FilterIgnoredNotice />
      <div class="grid">
        <Card label="Attempts" val={fmtNum(d.starts)} hint="total starts" />
        <Card label="Unique Players" val={fmtNum(d.startPlayers)} cls="live" hint="tried daily" />
        <Card label="Completions" val={fmtNum(d.completes)} cls="green" hint="cleared" />
        <Card label="Completion Rate" val={d.completionRate + '%'} cls={d.completionRate >= 50 ? 'green' : 'warn'} />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Deaths" val={fmtNum(d.deaths)} cls="warn" hint="on daily stage" />
        <Card label="Avg Time" val={fmtMs(d.avgTime)} hint="per completion" />
        <Card label="Best Time" val={fmtMs(d.bestTime)} cls="gold" hint="fastest clear" />
        <Card label="Avg Deaths/Run" val={d.avgDeaths} hint="per completion" />
      </div>

      {d.deathCauses && d.deathCauses.length > 0 && (
        <>
          <h2>Death Causes (Daily Stage)</h2>
          <div class="panel">
            {(() => { const max = Math.max(...d.deathCauses.map(r => r.c), 1); return d.deathCauses.map(r => <BarRow key={r.cause} label={r.cause || 'unknown'} value={r.c} max={max} cls="red" />); })()}
          </div>
        </>
      )}

      {d.byDiff && d.byDiff.length > 0 && (
        <>
          <h2>By Difficulty (Rank Tier)</h2>
          <div class="panel scroll-x">
            <Table columns={byDiffCols} rows={d.byDiff} exportable exportFilename={`ndj-daily-bydiff-${range.value}-${today}.csv`} />
          </div>
        </>
      )}

      {d.byDay && d.byDay.length > 0 && (
        <>
          <h2>Daily Trend</h2>
          <div class="panel scroll-x">
            <Table columns={byDayCols} rows={d.byDay} exportable exportFilename={`ndj-daily-trend-${range.value}-${today}.csv`} />
          </div>
        </>
      )}
    </>
  );
}
