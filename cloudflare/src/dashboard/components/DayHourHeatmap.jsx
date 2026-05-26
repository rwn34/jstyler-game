import { fmtNum } from '../format.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DayHourHeatmap({ data }) {
  if (!data || data.length !== 7) return null;
  const max = Math.max(...data.flat(), 1);

  return (
    <div class="dow-heatmap">
      <div class="dow-heatmap-corner"></div>
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} class="dow-heatmap-hdr">{h}</div>
      ))}
      {DAYS.map((day, di) => (
        <>
          <div key={'l' + di} class="dow-heatmap-row-label">{day}</div>
          {Array.from({ length: 24 }, (_, h) => {
            const v = data[di][h] || 0;
            const alpha = v > 0 ? 0.15 + (v / max) * 0.85 : 0.04;
            return (
              <div
                key={di + '-' + h}
                class="dow-heatmap-cell"
                style={{ background: `rgba(0,255,255,${alpha})` }}
                title={`${day} ${h}:00 — ${fmtNum(v)} events`}
              />
            );
          })}
        </>
      ))}
    </div>
  );
}
