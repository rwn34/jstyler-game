import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs } from '../format.js';
import { LEVEL_NAMES, LEVEL_DIFFS } from '../constants.js';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Levels({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.levels;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/levels', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, levels: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  return (
    <>
      <h2>All 20 Levels — Detailed (range {range.value})</h2>
      <div class="panel scroll-x">
        <table>
          <thead><tr>
            <th>#</th><th>Name</th><th>Diff</th><th class="num">Starts</th><th class="num">Wins</th><th class="num">Win%</th><th class="num">Passed</th><th class="num">Stuck</th><th class="num">Deaths</th><th class="num">Median Time</th><th class="num">Avg Time</th><th class="num">Best</th><th class="num">Avg Try</th><th class="num">Avg ☠</th><th class="gold">Avg ★</th><th class="num">Avg ♦</th><th class="num">Resur.</th>
          </tr></thead>
          <tbody>
            {d.levels.map((l, i) => {
              const stuckCls = l.stuck > l.passed ? 'warn' : 'num';
              const diffCls = LEVEL_DIFFS[i] === 'HARD' ? ' bad' : LEVEL_DIFFS[i] === 'MODERATE' ? ' warn' : '';
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{LEVEL_NAMES[i] || '?'}</td>
                  <td><span class={`badge${diffCls}`}>{LEVEL_DIFFS[i]}</span></td>
                  <td class="num">{fmtNum(l.starts)}</td>
                  <td class="num">{fmtNum(l.completes)}</td>
                  <td class="num">{l.completionRate}%</td>
                  <td class="num">{fmtNum(l.passed)}</td>
                  <td class={stuckCls}>{fmtNum(l.stuck)}</td>
                  <td class="num">{fmtNum(l.deaths)}</td>
                  <td class="num">{fmtMs(l.medianMs)}</td>
                  <td class="num">{fmtMs(l.avgMs)}</td>
                  <td class="num">{fmtMs(l.minMs)}</td>
                  <td class="num">{l.avgAttempts != null ? l.avgAttempts : '—'}</td>
                  <td class="num">{l.avgDeaths != null ? l.avgDeaths.toFixed(1) : '—'}</td>
                  <td class="gold">{l.avgGold != null ? l.avgGold.toFixed(1) : '—'}</td>
                  <td class="num">{l.avgSilver != null ? l.avgSilver.toFixed(1) : '—'}</td>
                  <td class="num">{fmtNum(l.resurrects)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
