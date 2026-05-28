import { currentTab, range, currentPlayerPid, currentSegment } from '../state.js';
import { fmtAgo } from '../format.js';
import { writeHash } from '../lib/url.js';

export function HealthVerdict({ alerts, dau7d, dauToday, lastCheck }) {
  const high = alerts?.high ?? 0;
  const medium = alerts?.medium ?? 0;
  const dauDrop = dau7d > 0 ? (dau7d - dauToday) / dau7d : 0;

  let state, headline, subtitle;
  if (high > 0) {
    state = 'alert';
    headline = high === 1 ? '1 active alert' : `${high} active alerts`;
  } else if (medium > 0 || dauDrop > 0.30) {
    state = 'attention';
    const bits = [];
    if (medium > 0) bits.push(`${medium} anomal${medium === 1 ? 'y' : 'ies'} need attention`);
    if (dauDrop > 0.30) bits.push(`DAU down ${Math.round(dauDrop * 100)}% vs prior period`);
    headline = bits.join(' · ');
  } else {
    state = 'healthy';
    headline = 'All systems normal';
  }

  subtitle = lastCheck ? `Last checked: ${fmtAgo(lastCheck)}` : '';

  const cls = state === 'healthy' ? 'live' : state === 'attention' ? 'warn' : 'bad';
  const icon = state === 'healthy' ? '🟢' : state === 'attention' ? '🟡' : '🔴';
  const role = state === 'alert' ? 'alert' : 'status';

  function onClick() {
    if (state !== 'healthy') {
      writeHash('live', 'alerts', range.value, currentPlayerPid.value, currentSegment.value);
      currentTab.value = 'live';
    }
  }

  return (
    <div
      class={`health-verdict ${cls}`}
      role={role}
      aria-live="polite"
      onClick={onClick}
      style={state !== 'healthy' ? 'cursor:pointer' : ''}
    >
      <span class="hv-icon" aria-hidden="true">{icon}</span>
      <div class="hv-body">
        <div class="hv-headline">{headline}</div>
        {subtitle && <div class="hv-sub">{subtitle}</div>}
      </div>
    </div>
  );
}
