import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtMs } from '../format.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
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

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  return (
    <>
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
          <div class="panel scroll-x"><table><thead><tr><th>Difficulty</th><th class="num">Starts</th><th class="num">Completions</th><th class="num">Rate</th></tr></thead><tbody>
            {d.byDiff.map(r => {
              const rate = r.starts > 0 ? Math.round((r.completes / r.starts) * 1000) / 10 : 0;
              return <tr key={r.diff}><td><span class={`badge ${r.diff === 'HARD' ? 'bad' : r.diff === 'MODERATE' ? 'warn' : ''}`}>{r.diff || '?'}</span></td><td class="num">{fmtNum(r.starts)}</td><td class="num">{fmtNum(r.completes)}</td><td class="num">{rate}%</td></tr>;
            })}
          </tbody></table></div>
        </>
      )}

      {d.byDay && d.byDay.length > 0 && (
        <>
          <h2>Daily Trend</h2>
          <div class="panel scroll-x"><table><thead><tr><th>Day</th><th class="num">Attempts</th><th class="num">Completions</th><th class="num">Unique Players</th></tr></thead><tbody>
            {d.byDay.map(r => <tr key={r.day}><td>Day {r.day != null ? r.day : '?'}</td><td class="num">{fmtNum(r.starts)}</td><td class="num">{fmtNum(r.completes)}</td><td class="num">{fmtNum(r.players)}</td></tr>)}
          </tbody></table></div>
        </>
      )}
    </>
  );
}
