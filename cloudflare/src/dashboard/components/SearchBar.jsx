import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { searchQuery, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { escapeHtml, truncatePid, fmtAgo } from '../format.js';

export function SearchBar() {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hlIdx, setHlIdx] = useState(-1);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  function doSearch(q) {
    if (!q || q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetchJson('/stats/search?q=' + encodeURIComponent(q) + '&limit=20')
      .then(d => { setResults(d.players || []); setOpen(true); setHlIdx(-1); })
      .catch(() => { setResults([]); })
      .finally(() => setLoading(false));
  }

  function onInput(e) {
    const v = e.target.value;
    searchQuery.value = v;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 300);
  }

  function selectPlayer(pid) {
    currentPlayerPid.value = pid;
    setOpen(false);
    if (inputRef.current) inputRef.current.value = '';
    searchQuery.value = '';
  }

  const onKeyDown = useCallback((e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timerRef.current); doSearch(searchQuery.value); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHlIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHlIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (hlIdx >= 0 && results[hlIdx]) selectPlayer(results[hlIdx].pid); else if (results[0]) selectPlayer(results[0].pid); }
    else if (e.key === 'Escape') { setOpen(false); }
  }, [open, results, hlIdx]);

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.search-bar')) setOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div class="search-bar" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search player…"
        aria-label="Search player by name or PID"
        aria-autocomplete="list"
        aria-controls="search-results"
        aria-activedescendant={hlIdx >= 0 ? `sr-${hlIdx}` : undefined}
        onInput={onInput}
        onKeyDown={onKeyDown}
        value={searchQuery.value}
      />
      <div id="search-results" role="listbox" class={`results${open ? ' open' : ''}`}>
        {loading && <div class="result-item" role="option" aria-disabled="true" style="color:#aaa">Searching…</div>}
        {!loading && results.length === 0 && open && <div class="result-item" role="option" aria-disabled="true" style="color:#aaa">No results</div>}
        {results.map((p, i) => (
          <div key={p.pid} id={`sr-${i}`} role="option" aria-selected={i === hlIdx}
            class={`result-item${i === hlIdx ? ' highlighted' : ''}`}
            onClick={() => selectPlayer(p.pid)}>
            <span class="name">{escapeHtml(p.name) || '(anon)'}</span>{' '}
            <span class="pid">{truncatePid(p.pid)}</span>{' '}
            <span style="color:#aaa;font-size:.5rem">{fmtAgo(p.last_seen)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
