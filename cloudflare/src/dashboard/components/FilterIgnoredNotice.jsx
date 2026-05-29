import { currentFilters } from '../state.js';

export function FilterIgnoredNotice() {
  const f = currentFilters.value;
  const hasAny = f.cc || f.level || f.version || f.named;
  if (!hasAny) return null;
  return (
    <div class="filter-ignored-notice">
      ⓘ This tab ignores the active filter(s). Cohort/qualitative data isn't filterable.
    </div>
  );
}
