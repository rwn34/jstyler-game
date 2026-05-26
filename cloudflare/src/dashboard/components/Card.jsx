export function Card({ label, val, cls, hint, delta, deltaInverse }) {
  let deltaEl = null;
  if (delta != null && delta !== 0) {
    const positive = delta > 0;
    // For inverse metrics (e.g. deaths), positive delta is bad
    const good = deltaInverse ? !positive : positive;
    const color = good ? '#0f8' : '#f44';
    const arrow = positive ? '▲' : '▼';
    deltaEl = <span class="card-delta" style={{ color }}>{arrow} {positive ? '+' : ''}{delta}%</span>;
  }
  return (
    <div class={`card ${cls || ''}`}>
      <div class="lbl">{label}</div>
      <div class="val">{val}{deltaEl}</div>
      {hint && <div class="pct">{hint}</div>}
    </div>
  );
}
