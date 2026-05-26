import { fmtNum } from '../format.js';

export function Funnel({ stages }) {
  if (!stages || stages.length === 0) return null;
  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const barHeight = 36;
  const gap = 8;
  const totalHeight = stages.length * (barHeight + gap) + stages.length * 16;
  const width = 500;
  const labelWidth = 140;
  const barMaxWidth = width - labelWidth - 80;

  return (
    <svg class="funnel-svg" viewBox={`0 0 ${width} ${totalHeight}`} style="width:100%;max-width:500px;height:auto">
      {stages.map((s, i) => {
        const barW = Math.max(4, (s.count / maxCount) * barMaxWidth);
        const y = i * (barHeight + gap + 16);
        const opacity = 1 - (i * 0.12);
        return (
          <g key={s.key}>
            <text x={0} y={y + barHeight / 2 + 4} fill="#aaa" font-size="10" font-family="monospace">{s.label}</text>
            <rect x={labelWidth} y={y} width={barW} height={barHeight} rx={3} fill={`rgba(0,255,255,${opacity})`} />
            <text x={labelWidth + barW + 6} y={y + barHeight / 2 + 4} fill="#0ff" font-size="11" font-family="monospace" font-weight="bold">{fmtNum(s.count)}</text>
            {i > 0 && (
              <text x={labelWidth + barW + 6} y={y + barHeight / 2 + 16} fill={s.conversion_pct >= 50 ? '#0f8' : s.conversion_pct >= 25 ? '#fa0' : '#f44'} font-size="9" font-family="monospace">
                {s.conversion_pct}% conv
              </text>
            )}
            {i > 0 && s.drop_pct > 0 && (
              <text x={labelWidth} y={y - 3} fill="#f44" font-size="8" font-family="monospace">▼ {s.drop_pct}% drop</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
