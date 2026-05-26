import { fmtNum } from '../format.js';

const SCALES = {
  blue: (alpha) => `rgba(0,255,255,${alpha})`,
  red: (alpha) => `rgba(255,68,68,${alpha})`,
  gold: (alpha) => `rgba(255,215,0,${alpha})`,
};

export function Matrix({ xLabels, yLabels, data, formatCell, colorScale = 'red' }) {
  if (!data || !data.length || !xLabels || !yLabels) return null;
  const colorFn = SCALES[colorScale] || SCALES.blue;

  // Find max per row for row-relative coloring
  const rowMaxes = data.map(row => Math.max(...row, 1));

  return (
    <div class="matrix-wrap scroll-x">
      <table class="matrix-table">
        <thead><tr>
          <th></th>
          {xLabels.map(x => <th key={x} class="matrix-col-hdr">{x}</th>)}
        </tr></thead>
        <tbody>
          {yLabels.map((y, ri) => (
            <tr key={y}>
              <td class="matrix-row-hdr">{y}</td>
              {xLabels.map((x, ci) => {
                const v = data[ri] && data[ri][ci] != null ? data[ri][ci] : 0;
                const alpha = v > 0 ? 0.15 + (v / rowMaxes[ri]) * 0.85 : 0;
                return (
                  <td key={ci} class="matrix-cell" style={{ background: colorFn(alpha) }} title={`${y} × ${x}: ${fmtNum(v)}`}>
                    {formatCell ? formatCell(v) : (v > 0 ? v : '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
