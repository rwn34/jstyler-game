import { useCallback } from 'preact/hooks';
import { currentTab } from '../state.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'levels', label: 'Per Level' },
  { id: 'players', label: 'Per Player' },
  { id: 'watchlist', label: '🚩 Watchlist' },
  { id: 'retention', label: 'Retention' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'geo', label: 'Geo' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'economy', label: 'Economy' },
  { id: 'dailystage', label: '🔥 Daily' },
  { id: 'feed', label: 'Live Feed' },
  { id: 'alerts', label: '⚠ Alerts' },
  { id: 'appversion', label: 'App Ver' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'sync', label: 'Cloud Sync' },
];

export function Tabs() {
  const onKeyDown = useCallback((e) => {
    const idx = TABS.findIndex(t => t.id === currentTab.value);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    currentTab.value = TABS[next].id;
  }, []);

  return (
    <nav aria-label="Dashboard tabs">
      <div class="tabs-scroll">
        <div class="tabs" role="tablist" onKeyDown={onKeyDown}>
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={currentTab.value === t.id}
              aria-controls={`pane-${t.id}`}
              tabIndex={currentTab.value === t.id ? 0 : -1}
              class={`tab${currentTab.value === t.id ? ' active' : ''}`}
              onClick={() => { currentTab.value = t.id; }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
