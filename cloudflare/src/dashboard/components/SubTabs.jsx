import { useCallback } from 'preact/hooks';
import { currentTab, range, currentPlayerPid, currentSegment, currentFilters } from '../state.js';
import { writeHash } from '../lib/url.js';

export function SubTabs({ tabs, active, onChange, ariaLabel }) {
  const onKeyDown = useCallback((e) => {
    const idx = tabs.findIndex(t => t.id === active);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
  }, [tabs, active, onChange]);

  return (
    <nav aria-label={ariaLabel || 'Sub-tabs'} class="subtabs-nav">
      <div class="subtabs" role="tablist" onKeyDown={onKeyDown}>
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            id={`subtab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`subpane-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            class={`subtab${active === t.id ? ' active' : ''}`}
            onClick={() => {
              onChange(t.id);
              const f = currentFilters.value;
              writeHash(currentTab.value, t.id, range.value, currentPlayerPid.value, currentSegment.value, f.cc, f.level, f.version, f.named);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
