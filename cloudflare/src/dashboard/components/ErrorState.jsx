export function ErrorState({ error }) {
  return <div style="color:#f44;font-family:monospace;padding:20px;font-weight:700">● Error: {error?.message || String(error)}</div>;
}
