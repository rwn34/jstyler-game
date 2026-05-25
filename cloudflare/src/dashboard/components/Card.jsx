export function Card({ label, val, cls, hint }) {
  return (
    <div class={`card ${cls || ''}`}>
      <div class="lbl">{label}</div>
      <div class="val">{val}</div>
      {hint && <div class="pct">{hint}</div>}
    </div>
  );
}
