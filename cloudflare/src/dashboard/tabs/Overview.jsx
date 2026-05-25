import { useState, useEffect } from 'preact/hooks';
import { range, loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtDate } from '../format.js';
import { LEVEL_NAMES } from '../constants.js';
import { Card } from '../components/Card.jsx';
import { BarRow } from '../components/BarRow.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Overview({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.overview;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, overview: Date.now() }; })
      .catch(setErr);
  }, [range.value, force]);

  if (err) return <ErrorState error={err} />;
  if (!d) return <LoadingPane />;

  const winRate = (d.winMatches + d.deathMatches) > 0 ? Math.round(d.winMatches / (d.winMatches + d.deathMatches) * 100) : 0;
  const convertRate = (d.anonPlayers + d.namedPlayers) > 0 ? Math.round(d.namedPlayers / (d.anonPlayers + d.namedPlayers) * 100) : 0;
  const types = ['session_start', 'heartbeat', 'level_start', 'level_complete', 'level_death', 'purchase', 'ui_event'];

  return (
    <>
      <div class="grid">
        <Card label="Online Now" val={fmtNum(d.online)} cls="live" hint="last 5 min" />
        <Card label="Active in Range" val={fmtNum(d.activeInRange)} hint="unique players" />
        <Card label="New Players" val={fmtNum(d.newPlayers)} cls="green" />
        <Card label="Returning" val={fmtNum(d.returningPlayers)} cls="gold" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Total Mins (New)" val={fmtNum(d.totalMinutesNew)} cls="green" hint="across all new" />
        <Card label="Total Mins (Ret.)" val={fmtNum(d.totalMinutesReturning)} cls="gold" hint="across returning" />
        <Card label="Median Mins (New)" val={d.medianMinutesNew + 'm'} cls="green" hint="per player (typical)" />
        <Card label="Median Mins (Ret.)" val={d.medianMinutesReturning + 'm'} cls="gold" hint="per player (typical)" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Win Matches" val={fmtNum(d.winMatches)} cls="live" />
        <Card label="Death Matches" val={fmtNum(d.deathMatches)} cls="warn" />
        <Card label="Win Rate" val={winRate + '%'} cls={winRate > 50 ? 'live' : 'warn'} />
        <Card label="Total Mins Played" val={fmtNum(d.totalMinutes)} hint="all players" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Total Events" val={fmtNum(d.totalEvents)} />
        <Card label="Verified" val={fmtNum(d.verified)} hint={(d.totalEvents > 0 ? Math.round(d.verified / d.totalEvents * 100) : 0) + '% of total'} />
        <Card label="Unverified" val={fmtNum(d.unverified)} cls="warn" />
        <Card label="Total Players" val={fmtNum(d.totalPlayers)} cls="gold" hint="all-time" />
      </div>
      <div class="grid" style="margin-top:8px">
        <Card label="Named Players" val={fmtNum(d.namedPlayers)} cls="live" hint="completed onboarding" />
        <Card label="Trial / Bounced" val={fmtNum(d.anonPlayers)} cls="warn" hint="never named" />
        <Card label="Name-Set Conv." val={convertRate + '%'} cls={convertRate > 50 ? 'live' : 'warn'} hint="named ÷ total active" />
        <Card label="Name-Set Events" val={fmtNum(d.nameSetEvents)} cls="gold" hint="naming actions in range" />
      </div>

      <h2>Today's Activity</h2>
      <div class="panel"><div class="types">
        {types.map(t => (
          <div key={t} class="type-card"><div class="lbl">{t.replace(/_/g, ' ')}</div><div class="val">{fmtNum(d.today[t] || 0)}</div></div>
        ))}
      </div></div>

      <h2>Range Activity (events per day)</h2>
      <div class="panel"><DayChart arr={d.last7Days} /></div>

      <h2>Popular Levels</h2>
      <div class="panel"><LevelBars rows={d.popularLevels} k="c" /></div>
      <h2>Deaths Per Level</h2>
      <div class="panel"><LevelBars rows={d.deathsByLevel} k="c" red /></div>
    </>
  );
}

function DayChart({ arr }) {
  if (!arr || !arr.length) return <div style="color:#666">No data</div>;
  const max = Math.max(...arr, 1);
  const now = Date.now();
  return (
    <div class="chart">
      {arr.map((v, i) => {
        const pct = (v / max) * 100;
        const dt = new Date(now - (arr.length - 1 - i) * 86400000);
        return <div key={i} class="bar" data-val={fmtDate(dt.getTime()) + ': ' + fmtNum(v)} style={{ height: pct + '%' }} />;
      })}
    </div>
  );
}

function LevelBars({ rows, k, red }) {
  if (!rows || !rows.length) return <div style="color:#666;font-size:.7rem">No data</div>;
  const max = Math.max(...rows.map(r => r[k]), 1);
  return rows.map(r => {
    const ln = r.level != null ? (r.level + 1) + '. ' + (LEVEL_NAMES[r.level] || '?') : '?';
    return <BarRow key={r.level} label={ln} value={r[k]} max={max} cls={red ? 'red' : ''} />;
  });
}
