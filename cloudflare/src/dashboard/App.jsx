import { useState, useCallback } from 'preact/hooks';
import { range, currentTab, loadedAt } from './state.js';
import { DataFreshness, useFreshnessTick } from './components/DataFreshness.jsx';
import { compareEnabled } from './lib/compare.js';
import { fmtTime } from './format.js';
import { Tabs } from './components/Tabs.jsx';
import { SearchBar } from './components/SearchBar.jsx';
import { PlayerModal } from './components/PlayerModal.jsx';
import { FilterStrip } from './components/FilterStrip.jsx';
import { Overview } from './tabs/Overview.jsx';
import { Levels } from './tabs/Levels.jsx';
import { Players } from './tabs/Players.jsx';
import { Retention } from './tabs/Retention.jsx';
import { Activity } from './tabs/Activity.jsx';
import { Economy } from './tabs/Economy.jsx';
import { DailyStage } from './tabs/DailyStage.jsx';
import { Live } from './tabs/Live.jsx';
import { Platform } from './tabs/Platform.jsx';
import { Feedback } from './tabs/Feedback.jsx';

const RANGES = ['1d', '2d', '3d', '7d', '14d', '31d', 'all'];

export function App() {
  useFreshnessTick();
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
      <a href={`#pane-${tab}`} class="skip-link">Skip to content</a>

      <header>
        <h1>★ N3ON DashJ <span class="sub">LIVE METRICS</span></h1>
        <div id="status">
          <span class="live">●</span> Live • Range {range.value.toUpperCase()} • {fmtTime(Date.now())} UTC+7 • <DataFreshness />
        </div>
      </header>

      <div class="toolbar" role="toolbar" aria-label="Dashboard controls">
        <span class="label">RANGE:</span>
        {RANGES.map(r => (
          <button key={r} class={`range-btn${range.value === r ? ' active' : ''}`} onClick={() => setRange(r)} aria-pressed={range.value === r}>
            {r.toUpperCase()}
          </button>
        ))}
        <label class="compare-toggle">
          <input type="checkbox" checked={compareEnabled.value} onChange={e => { compareEnabled.value = e.target.checked; }} aria-label="Toggle period comparison" />
          <span>Compare</span>
        </label>
        <SearchBar />
        <button class="check-btn" onClick={checkNow} aria-label="Refresh all data">⟳ CHECK NOW</button>
      </div>

      <Tabs />
      <FilterStrip />

      <main id={`pane-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <div key={tab + ':' + forceKey}>
          {tab === 'overview' && <Overview force={force} />}
          {tab === 'levels' && <Levels force={force} />}
          {tab === 'players' && <Players force={force} />}
          {tab === 'retention' && <Retention force={force} />}
          {tab === 'activity' && <Activity force={force} />}
          {tab === 'economy' && <Economy force={force} />}
          {tab === 'dailystage' && <DailyStage force={force} />}
          {tab === 'live' && <Live />}
          {tab === 'platform' && <Platform force={force} />}
          {tab === 'feedback' && <Feedback force={force} />}
        </div>
      </main>

      <footer class="footer">© N3ON DashJ Metrics — Phase 5 complete • 5-min cache • Times in UTC+7</footer>

      <PlayerModal />
    </>
  );
}
