import { useState, useMemo } from 'preact/hooks';
import { exportCsv } from '../lib/csv.js';

function retColor(pct) {
  if (pct >= 50) return 'rgba(0,255,136,0.25)';
  if (pct >= 30) return 'rgba(255,170,0,0.25)';
  return 'rgba(255,68,68,0.2)';
}

export function CohortTable({ cohorts }) {
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const arr = [...(cohorts || [])];
    return arr.sort((a, b) => sortDir === 'desc' ? b.week.localeCompare(a.week) : a.week.localeCompare(b.week));
  }, [cohorts, sortDir]);

  if (!cohorts || cohorts.length === 0) return <div style="color:#666;font-family:monospace;padding:12px">No cohort data</div>;

  const columns = [
    { key: 'week', label: 'Week' },
    { key: 'cohort_size', label: 'Cohort' },
    { key: 'd1_pct', label: 'D1 %' },
    { key: 'd7_pct', label: 'D7 %' },
    { key: 'd30_pct', label: 'D30 %' },
  ];

  return (
    <div>
      <div class="tbl-toolbar">
        <button class="tbl-export-btn" onClick={() => exportCsv(sorted, columns, 'ndj-retention-cohorts.csv')}>⬇ CSV</button>
      </div>
      <table>
        <thead><tr>
          <th class="sortable" style="cursor:pointer" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
            Week {sortDir === 'desc' ? '▼' : '▲'}
          </th>
          <th class="num">Cohort</th>
          <th class="num">D1</th>
          <th class="num">D1 %</th>
          <th class="num">D7</th>
          <th class="num">D7 %</th>
          <th class="num">D30</th>
          <th class="num">D30 %</th>
        </tr></thead>
        <tbody>
          {sorted.map(c => (
            <tr key={c.week}>
              <td>{c.week}</td>
              <td class="num">{c.cohort_size}</td>
              <td class="num">{c.d1}</td>
              <td class="num" style={{ background: retColor(c.d1_pct) }}>{c.d1_pct}%</td>
              <td class="num">{c.d7}</td>
              <td class="num" style={{ background: retColor(c.d7_pct) }}>{c.d7_pct}%</td>
              <td class="num">{c.d30}</td>
              <td class="num" style={{ background: retColor(c.d30_pct) }}>{c.d30_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
