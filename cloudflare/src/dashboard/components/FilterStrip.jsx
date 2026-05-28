import { currentFilters, currentTab, range, currentPlayerPid, currentSegment } from '../state.js';
import { writeHash, parseHash } from '../lib/url.js';

export function FilterStrip() {
  const f = currentFilters.value;
  const chips = [];
  if (f.cc) chips.push({ key: 'cc', label: `🌎 ${f.cc.toUpperCase()}` });
  if (f.level) chips.push({ key: 'level', label: `🎯 Level ${f.level}` });
  if (f.version) chips.push({ key: 'version', label: `📱 ${f.version}` });
  if (f.named) chips.push({ key: 'named', label: `👤 Named` });

  if (chips.length === 0) return null;

  function remove(key) {
    const next = { ...currentFilters.value };
    delete next[key];
    currentFilters.value = next;
    const h = parseHash();
    writeHash(currentTab.value, h.subTab, range.value, currentPlayerPid.value, currentSegment.value, next.cc, next.level, next.version, next.named);
  }

  function clearAll() {
    currentFilters.value = {};
    const h = parseHash();
    writeHash(currentTab.value, h.subTab, range.value, currentPlayerPid.value, currentSegment.value, '', '', '', '');
  }

  return (
    <div class="filter-strip" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 16px;background:#1a1a2e;border-bottom:1px solid #333;font-size:.75rem">
      <span style="color:#888">Filters:</span>
      {chips.map(c => (
        <span key={c.key} class="filter-chip" style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#2a2a4e;border-radius:12px;color:#cce">
          {c.label}
          <button
            onClick={() => remove(c.key)}
            style="background:none;border:none;color:#888;cursor:pointer;font-size:.8rem;line-height:1;padding:0 2px"
            aria-label={`Remove ${c.key} filter`}
          >×</button>
        </span>
      ))}
      <button
        onClick={clearAll}
        style="background:none;border:none;color:#f88;cursor:pointer;font-size:.7rem;text-decoration:underline"
      >Clear all</button>
    </div>
  );
}
