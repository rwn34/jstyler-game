import { fmtNum } from '../format.js';

export function BarRow({ label, value, max, cls, countText }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div class="bar-row">
      <div class="label">{label}</div>
      <div class="bar">
        <div class={`bar-fill${cls ? ' ' + cls : ''}`} style={{ width: pct + '%' }} />
      </div>
      <div class="count">{countText || fmtNum(value)}</div>
    </div>
  );
}
