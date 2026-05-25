import { useState, useRef, useEffect } from 'preact/hooks';
import { searchQuery, currentPlayerPid } from '../state.js';
import { fetchJson } from '../api.js';
import { escapeHtml, truncatePid, fmtAgo } from '../format.js';

export function SearchBar() {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  function doSearch(q) {
    if (!q || q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetchJson('/stats/search?q=' + encodeURIComponent(q) + '&limit=20')
      .then(d => { setResults(d.players || []); setOpen(true); })
      .catch(() => { setResults([]); })
      .finally(() => setLoading(false));
  }

  function onInput(e) {
    const v = e.target.value;
    searchQuery.value = v;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 300);
  }

  function onSubmit(e) {
    e.preventDefault();
    clearTimeout(timerRef.current);
    doSearch(searchQuery.value);
  }

  function selectPlayer(pid) {
    currentPlayerPid.value = pid;
    setOpen(false);
    if (inputRef.current) inputRef.current.value = '';
    searchQuery.value = '';
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.search-bar')) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <form class="search-bar" onSubmit={onSubmit}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search player…"
        onInput={onInput}
        value={searchQuery.value}
      />
      <div class={`results${open ? ' open' : ''}`}>
        {loading && <div class="result-item" style="color:#666">Searching…</div>}
        {!loading && results.length === 0 && open && <div class="result-item" style="color:#666">No results</div>}
        {results.map(p => (
          <div key={p.pid} class="result-item" onClick={() => selectPlayer(p.pid)}>
            <span class="name">{escapeHtml(p.name) || '(anon)'}</span>{' '}
            <span class="pid">{truncatePid(p.pid)}</span>{' '}
            <span style="color:#666;font-size:.5rem">{fmtAgo(p.last_seen)}</span>
          </div>
        ))}
      </div>
    </form>
  );
}
