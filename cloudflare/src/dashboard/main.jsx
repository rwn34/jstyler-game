import { render } from 'preact';
import { App } from './App.jsx';
import { range, currentTab, currentPlayerPid } from './state.js';
import { parseHash, writeHash } from './lib/url.js';
import css from './dashboard.css';

// Inject CSS
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

// Initialize state from URL hash
const VALID_TABS = ['overview','levels','players','watchlist','retention','sessions','geo','engagement','economy','dailystage','feed','alerts','appversion','feedback','sync'];
const VALID_RANGES = ['1d','2d','3d','7d','14d','31d','all'];

function applyHash() {
  const h = parseHash();
  if (h.tab && VALID_TABS.includes(h.tab)) currentTab.value = h.tab;
  if (h.range && VALID_RANGES.includes(h.range)) range.value = h.range;
  if (h.player) currentPlayerPid.value = h.player;
  else currentPlayerPid.value = null;
}

applyHash();

window.addEventListener('hashchange', applyHash);

// Sync signals → URL
let writing = false;
function syncToHash() {
  if (writing) return;
  writing = true;
  writeHash(currentTab.value, range.value, currentPlayerPid.value);
  writing = false;
}
currentTab.subscribe(syncToHash);
range.subscribe(syncToHash);
currentPlayerPid.subscribe(syncToHash);

// Mount app
try {
  render(<App />, document.getElementById('root'));
} catch (e) {
  var root = document.getElementById('root');
  if (root) root.innerHTML = '<div style="padding:40px;text-align:center;font-family:monospace;color:#f44;"><h1>Dashboard Error</h1><pre style="color:#aaa;white-space:pre-wrap;">' + String(e && e.stack || e) + '</pre></div>';
  console.error('Dashboard mount failed:', e);
}
