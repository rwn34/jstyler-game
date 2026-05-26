export function EmptyState({ message, hint }) {
  return (
    <div class="empty-state">
      <div class="empty-msg">{message || 'No data'}</div>
      {hint && <div class="empty-hint">{hint}</div>}
    </div>
  );
}
