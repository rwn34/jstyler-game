import { currentTab } from '../state.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'levels', label: 'Per Level' },
  { id: 'players', label: 'Per Player' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'economy', label: 'Economy' },
  { id: 'dailystage', label: '🔥 Daily' },
  { id: 'feed', label: 'Live Feed' },
  { id: 'appversion', label: 'App Ver' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'sync', label: 'Cloud Sync' },
];

export function Tabs() {
  return (
    <div class="tabs">
      {TABS.map(t => (
        <button
          key={t.id}
          class={`tab${currentTab.value === t.id ? ' active' : ''}`}
          onClick={() => { currentTab.value = t.id; }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
