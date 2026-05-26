import { useState, useCallback } from 'preact/hooks';
import { range, currentTab, loadedAt } from './state.js';
import { compareEnabled } from './lib/compare.js';
import { fmtTime } from './format.js';
import { Tabs } from './components/Tabs.jsx';
import { SearchBar } from './components/SearchBar.jsx';
import { PlayerModal } from './components/PlayerModal.jsx';
import { Overview } from './tabs/Overview.jsx';
import { Levels } from './tabs/Levels.jsx';
import { Players } from './tabs/Players.jsx';
import { Retention } from './tabs/Retention.jsx';
import { Sessions } from './tabs/Sessions.jsx';
import { Geo } from './tabs/Geo.jsx';
import { Engagement } from './tabs/Engagement.jsx';
import { Economy } from './tabs/Economy.jsx';
import { DailyStage } from './tabs/DailyStage.jsx';
import { Feed } from './tabs/Feed.jsx';
import { Alerts } from './tabs/Alerts.jsx';
import { AppVersion } from './tabs/AppVersion.jsx';
import { Feedback } from './tabs/Feedback.jsx';
import { Sync } from './tabs/Sync.jsx';

const RANGES = ['1d', '2d', '3d', '7d', '14d', '31d', 'all'];

export function App() {
  const [forceKey, setForceKey] = useState(0);

  const checkNow = useCallback(() => {
    loadedAt.value = {};
    setForceKey(k => k + 1);
  }, []);

  function setRange(r) {
    range.value = r;
    loadedAt.value = {};
    setForceKey(k => k + 1);
  }

  const tab = currentTab.value;
  const force = forceKey > 0;

  return (
    <>
      <h1>★ N3ON DashJ <span class="sub">LIVE METRICS</span></h1>
      <div id="status">
        <span class="live">●</span> Live • Range {range.value.toUpperCase()} • {fmtTime(Date.now())} UTC+7
      </div>

      <div class="toolbar">
        <span class="label">RANGE:</span>
        {RANGES.map(r => (
          <button key={r} class={`range-btn${range.value === r ? ' active' : ''}`} onClick={() => setRange(r)}>
            {r.toUpperCase()}
          </button>
        ))}
        <label class="compare-toggle">
          <input type="checkbox" checked={compareEnabled.value} onChange={e => { compareEnabled.value = e.target.checked; }} />
          <span>Compare</span>
        </label>
        <SearchBar />
        <button class="check-btn" onClick={checkNow}>⟳ CHECK NOW</button>
      </div>

      <Tabs />

      <div key={tab + ':' + forceKey}>
        {tab === 'overview' && <Overview force={force} />}
        {tab === 'levels' && <Levels force={force} />}
        {tab === 'players' && <Players force={force} />}
        {tab === 'retention' && <Retention force={force} />}
        {tab === 'sessions' && <Sessions force={force} />}
        {tab === 'geo' && <Geo force={force} />}
        {tab === 'engagement' && <Engagement force={force} />}
        {tab === 'economy' && <Economy force={force} />}
        {tab === 'dailystage' && <DailyStage force={force} />}
        {tab === 'feed' && <Feed force={force} />}
        {tab === 'alerts' && <Alerts />}
        {tab === 'appversion' && <AppVersion force={force} />}
        {tab === 'feedback' && <Feedback force={force} />}
        {tab === 'sync' && <Sync force={force} />}
      </div>

      <div class="footer">N3ON DashJ Metrics • 5-min cache • Times in UTC+7</div>

      <PlayerModal />
    </>
  );
}
