import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs } from '../format.js';
import { LEVEL_NAMES, LEVEL_DIFFS } from '../constants.js';
import { Table } from '../components/Table.jsx';
import { Matrix } from '../components/Matrix.jsx';
import { Histogram } from '../components/Histogram.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Levels({ force }) {
  const [d, setD] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [err, setErr] = useState(null);
  const [histLevel, setHistLevel] = useState(null);
  const [histData, setHistData] = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    const cached = loadedAt.value.levels;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    Promise.all([
      fetchJson('/stats/levels', { force }),
      fetchJson('/stats/death-matrix', { force }),
    ]).then(([levelsData, matrixData]) => {
      setD(levelsData);
      setMatrix(matrixData);
      loadedAt.value = { ...loadedAt.value, levels: Date.now() };
    }).catch(setErr);
  }, [range.value, force]);

  function loadHistogram(level) {
    if (histLevel === level) { setHistLevel(null); return; }
    setHistLevel(level);
    setHistLoading(true);
    setHistData(null);
    fetchJson('/stats/time-distribution?level=' + level, { force })
      .then(data => { setHistData(data); setHistLoading(false); })
      .catch(() => { setHistLoading(false); });
  }

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, levels: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;
  if (!d.levels || !d.levels.length) return <EmptyState message="No level data in this range" hint="Try widening the range." />;

  // Death matrix rendering
  let matrixEl = null;
  if (matrix && matrix.allCauses && matrix.allCauses.length > 0) {
    const xLabels = matrix.allCauses;
    const yLabels = matrix.levels.map((_, i) => LEVEL_NAMES[i] || String(i));
    const data2d = matrix.levels.map(l => xLabels.map(c => l.causes[c] || 0));
    matrixEl = (
      <>
        <h2>Death Cause × Level Matrix</h2>
        <div class="panel scroll-x">
          <Matrix xLabels={xLabels} yLabels={yLabels} data={data2d} colorScale="red" />
          <div style="font-size:.5rem;color:#666;margin-top:6px;font-family:monospace">Click a level row below for time distribution</div>
        </div>
      </>
    );
  }

  const rows = d.levels.map((l, i) => ({
    ...l,
    idx: i + 1,
    name: LEVEL_NAMES[i] || '?',
    diff: LEVEL_DIFFS[i],
  }));

  const today = new Date().toISOString().slice(0, 10);
  const columns = [
    { key: 'idx', label: '#', sortable: true, sortType: 'number' },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => <span style="cursor:pointer;text-decoration:underline" onClick={() => loadHistogram(r.level)}>{r.name}</span> },
    { key: 'diff', label: 'Diff', sortable: true, sortType: 'string', render: (r) => { const cls = r.diff === 'HARD' ? ' bad' : r.diff === 'MODERATE' ? ' warn' : ''; return <span class={`badge${cls}`}>{r.diff}</span>; } },
    { key: 'starts', label: 'Starts', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.starts) },
    { key: 'completes', label: 'Wins', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.completes) },
    { key: 'completionRate', label: 'Win%', align: 'right', sortable: true, sortType: 'number', render: r => r.completionRate + '%' },
    { key: 'passed', label: 'Passed', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.passed) },
    { key: 'stuck', label: 'Stuck', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.stuck), className: 'num' },
    { key: 'deaths', label: 'Deaths', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.deaths) },
    { key: 'medianMs', label: 'Median', align: 'right', sortable: true, sortType: 'number', render: r => fmtMs(r.medianMs) },
    { key: 'avgMs', label: 'Avg Time', align: 'right', sortable: true, sortType: 'number', render: r => fmtMs(r.avgMs) },
    { key: 'minMs', label: 'Best', align: 'right', sortable: true, sortType: 'number', render: r => fmtMs(r.minMs) },
    { key: 'avgAttempts', label: 'Avg Try', align: 'right', sortable: true, sortType: 'number', render: r => r.avgAttempts != null ? r.avgAttempts : '—' },
    { key: 'avgDeaths', label: 'Avg ☠', align: 'right', sortable: true, sortType: 'number', render: r => r.avgDeaths != null ? r.avgDeaths.toFixed(1) : '—' },
    { key: 'avgGold', label: 'Avg ★', align: 'right', sortable: true, sortType: 'number', className: 'gold', render: r => r.avgGold != null ? r.avgGold.toFixed(1) : '—' },
    { key: 'avgSilver', label: 'Avg ♦', align: 'right', sortable: true, sortType: 'number', render: r => r.avgSilver != null ? r.avgSilver.toFixed(1) : '—' },
    { key: 'resurrects', label: 'Resur.', align: 'right', sortable: true, sortType: 'number', render: r => fmtNum(r.resurrects) },
  ];

  return (
    <>
      {matrixEl}

      <h2>All 20 Levels — Detailed (range {range.value})</h2>
      <div class="panel scroll-x">
        <Table
          columns={columns}
          rows={rows}
          defaultSort={{ key: 'idx', dir: 'asc' }}
          filterable
          filterPlaceholder="Filter by name…"
          exportable
          exportFilename={`ndj-levels-${range.value}-${today}.csv`}
        />
      </div>

      {histLevel != null && (
        <div class="panel" style="margin-top:10px">
          <h3>⏱ Time Distribution — {LEVEL_NAMES[histLevel] || 'Level ' + histLevel}</h3>
          {histLoading && <LoadingPane />}
          {!histLoading && histData && histData.buckets && histData.buckets.length > 0 ? (
            <>
              <Histogram
                buckets={histData.buckets}
                markers={{ p25: histData.p25, p50: histData.p50, p75: histData.p75, p99: histData.p99 }}
                xFormatter={ms => (ms / 1000).toFixed(1) + 's'}
              />
              <div style="font-size:.55rem;color:#666;font-family:monospace;margin-top:6px">
                n={fmtNum(histData.total)} • p50={fmtMs(histData.p50)} • p75={fmtMs(histData.p75)} • p99={fmtMs(histData.p99)}
              </div>
            </>
          ) : (!histLoading && <EmptyState message="No completion time data for this level" />)}
        </div>
      )}
    </>
  );
}
