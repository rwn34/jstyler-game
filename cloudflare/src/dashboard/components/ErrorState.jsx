export function ErrorState({ error, onRetry }) {
  return (
    <div class="error-state">
      <div class="error-msg">● Error: {error?.message || String(error)}</div>
      {onRetry && <button class="error-retry-btn" onClick={onRetry}>⟳ Retry</button>}
    </div>
  );
}
