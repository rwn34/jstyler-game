import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Players({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.players;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/players', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, players: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  function openP(pid) { currentPlayerPid.value = pid; }

  function PlayerRow({ p, i, prefix, children }) {
    const displayName = escapeHtml(p.name) || '(anon)';
    return (
      <tr>
        <td>{i + 1}</td>
        <td><a href="javascript:void(0)" onClick={() => openP(p.pid)} style="color:#0ff;text-decoration:none;border-bottom:1px dotted rgba(0,255,255,.3)">{prefix || ''}{displayName}</a></td>
        <td class="pid"><a href="javascript:void(0)" onClick={() => openP(p.pid)} style="color:#666;text-decoration:none">{truncatePid(p.pid)}</a></td>
        {children}
      </tr>
    );
  }

  return (
    <>
      <h2>Recently Active</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th>Cohort</th><th>Last Seen</th></tr></thead><tbody>
        {(d.recentActive || []).map((p, i) => (
          <PlayerRow key={p.pid} p={p} i={i}>
            <td>{p.cohort === 'new' ? <span class="badge green">NEW</span> : <span class="badge gold">RETURNING</span>}</td>
            <td>{fmtAgo(p.last_seen)}</td>
          </PlayerRow>
        ))}
      </tbody></table></div>

      <h2>High Motivation (perseverance + streak)</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Perseverance</th><th class="num">Streak</th><th class="num">Score</th></tr></thead><tbody>
        {(d.highMotivation || []).map((p, i) => {
          const score = (p.perseverance || 0) + (p.streak || 0) * 5;
          return <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.perseverance || 0)}</td><td class="num">{fmtNum(p.streak || 0)}</td><td class="num">{fmtNum(score)}</td></PlayerRow>;
        })}
      </tbody></table></div>

      <h2>New Players (in range)</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Events</th><th>First Seen</th></tr></thead><tbody>
        {(d.newPlayers || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.events)}</td><td>{fmtAgo(p.first_seen)}</td></PlayerRow>)}
      </tbody></table></div>

      <h2>Returning Players (in range)</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Events</th><th>Last Seen</th></tr></thead><tbody>
        {(d.returningPlayers || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.events)}</td><td>{fmtAgo(p.last_seen)}</td></PlayerRow>)}
      </tbody></table></div>

      <h2>★ Champions (all 20 cleared, all-time)</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="gold">Cleared</th></tr></thead><tbody>
        {(d.champions || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i} prefix="★ "><td class="gold">{fmtNum(p.cleared)}</td></PlayerRow>)}
      </tbody></table></div>

      <h2>Most Active</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Events</th><th>Last Seen</th></tr></thead><tbody>
        {(d.topActive || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.events)}</td><td>{fmtAgo(p.last_seen)}</td></PlayerRow>)}
      </tbody></table></div>

      <h2>Top Completers</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Wins</th><th class="num">Unique Levels</th></tr></thead><tbody>
        {(d.topCompleters || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.completions)}</td><td class="num">{fmtNum(p.unique_levels)}/20</td></PlayerRow>)}
      </tbody></table></div>

      <h2>Wealthiest</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="gold">★ Gold</th><th class="num">♦ Silver</th></tr></thead><tbody>
        {(d.topGold || []).map((p, i) => <PlayerRow key={p.pid} p={p} i={i}><td class="gold">{fmtNum(Math.round(p.total_gold || 0))}</td><td class="num">{fmtNum(Math.round(p.total_silver || 0))}</td></PlayerRow>)}
      </tbody></table></div>

      <h2>Anti-cheat Watchlist</h2>
      <div class="panel scroll-x"><table><thead><tr><th>#</th><th>Name</th><th>PID</th><th class="num">Verified</th><th class="num">Total</th><th class="num">Ratio</th></tr></thead><tbody>
        {(d.lowestVerified || []).map((p, i) => {
          const ratio = p.total > 0 ? Math.round((p.v / p.total) * 100) : 0;
          return <PlayerRow key={p.pid} p={p} i={i}><td class="num">{fmtNum(p.v)}</td><td class="num">{fmtNum(p.total)}</td><td class="num"><span class={`badge ${ratio < 30 ? 'bad' : ratio < 60 ? 'warn' : ''}`}>{ratio}%</span></td></PlayerRow>;
        })}
      </tbody></table></div>
    </>
  );
}
