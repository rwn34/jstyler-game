import { useEffect } from 'preact/hooks';
import { currentTab, loadedAt, agoTick } from '../state.js';
import { fmtAgo } from '../format.js';

export function DataFreshness() {
  // Subscribe to the tick signal so we re-render every 30s
  const tick = agoTick.value;
  const tab = currentTab.value;
  const ts = loadedAt.value[tab];

  if (!ts) return null;

  const staleMs = Date.now() - ts;
  let cls = '';
  if (staleMs > 10 * 60 * 1000) cls = 'bad';
  else if (staleMs > 4 * 60 * 1000) cls = 'warn';

  return (
    <span class={`data-fresh ${cls}`} aria-label={`Data freshness: ${fmtAgo(ts)}`}>
      Data: {fmtAgo(ts)}
    </span>
  );
}

export function useFreshnessTick() {
  useEffect(() => {
    const interval = setInterval(() => { agoTick.value++; }, 30000);
    return () => clearInterval(interval);
  }, []);
}
