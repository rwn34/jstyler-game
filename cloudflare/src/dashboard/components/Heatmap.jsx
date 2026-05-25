import { fmtNum } from '../format.js';

export function Heatmap({ data, offset = -7 }) {
  const max = Math.max(...data, 1);
  return (
    <div class="heatmap">
      {Array.from({ length: 24 }, (_, i) => {
        const utcIdx = (i + offset + 24) % 24;
        const v = data[utcIdx] || 0;
        const alpha = v > 0 ? 0.15 + (v / max) * 0.85 : 0.05;
        return (
          <div
            key={i}
            class="heat-cell"
            style={{ background: `rgba(0,255,255,${alpha})` }}
            title={`${i}:00 (UTC+7) — ${fmtNum(v)}`}
          >
            {i}
          </div>
        );
      })}
    </div>
  );
}
