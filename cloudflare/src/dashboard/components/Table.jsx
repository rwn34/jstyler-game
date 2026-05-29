import { useState, useMemo, useRef, useCallback } from 'preact/hooks';
import { exportCsv } from '../lib/csv.js';

export function Table({ columns, rows, emptyMessage, defaultSort, filterable, filterPlaceholder, exportable, exportFilename, pageSize, onRowClick }) {
  const [sortKey, setSortKey] = useState(defaultSort ? defaultSort.key : null);
  const [sortDir, setSortDir] = useState(defaultSort ? defaultSort.dir : 'asc');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const debounceRef = useRef(null);

  const onFilter = useCallback((e) => {
    const v = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setFilterText(v); setPage(0); }, 200);
  }, []);

  const onHeaderClick = useCallback((col) => {
    if (!col.sortable) return;
    if (sortKey !== col.key) { setSortKey(col.key); setSortDir('desc'); }
    else if (sortDir === 'desc') setSortDir('asc');
    else { setSortKey(defaultSort ? defaultSort.key : null); setSortDir(defaultSort ? defaultSort.dir : 'asc'); }
  }, [sortKey, sortDir, defaultSort]);

  const filtered = useMemo(() => {
    if (!filterText) return rows || [];
    const lower = filterText.toLowerCase();
    return (rows || []).filter(row =>
      columns.some(c => {
        const v = row[c.key];
        return v != null && String(v).toLowerCase().indexOf(lower) >= 0;
      })
    );
  }, [rows, filterText, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    const type = col && col.sortType || 'string';
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (type === 'number') return (Number(av) - Number(bv)) * dir;
      if (type === 'date') return (Number(av) - Number(bv)) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const paged = useMemo(() => {
    if (!pageSize) return sorted;
    return sorted.slice(page * pageSize, (page + 1) * pageSize);
  }, [sorted, page, pageSize]);

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;

  if ((!rows || rows.length === 0) && !filterText) {
    return <div style="color:#aaa;font-family:monospace;padding:20px">{emptyMessage || 'No data'}</div>;
  }

  function ariaSort(col) {
    if (!col.sortable) return undefined;
    if (sortKey !== col.key) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function sortLabel(col) {
    if (!col.sortable) return '';
    if (sortKey !== col.key) return ' —';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  return (
    <div class="table-wrap">
      {(filterable || exportable) && (
        <div class="tbl-toolbar">
          {filterable && (
            <span class="tbl-filter">
              <input type="text" placeholder={filterPlaceholder || 'Filter…'} onInput={onFilter} class="tbl-filter-input" aria-label={filterPlaceholder || 'Filter table rows'} />
              {filterText && <span class="tbl-match-count" aria-live="polite">{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>}
            </span>
          )}
          {exportable && (
            <button class="tbl-export-btn" onClick={() => exportCsv(sorted, columns, exportFilename || 'export.csv')} aria-label="Export table as CSV">⬇ CSV</button>
          )}
        </div>
      )}
      <table role="table">
        <thead><tr>
          {columns.map(col => (
            <th key={col.key}
              class={(col.align === 'right' ? 'num' : col.className || '')}
              aria-sort={ariaSort(col)}
            >
              {col.sortable ? (
                <button class="sort-btn" onClick={() => onHeaderClick(col)} aria-label={`Sort by ${col.label}`}>
                  {col.label}{sortLabel(col)}
                </button>
              ) : col.label}
            </th>
          ))}
        </tr></thead>
        <tbody>
          {paged.length === 0 && <tr><td colspan={columns.length} style="color:#aaa;text-align:center;padding:12px">{filterText ? 'No matches' : (emptyMessage || 'No data')}</td></tr>}
          {paged.map((row, i) => (
            <tr key={i} class={onRowClick ? 'clickable-row' : ''} onClick={() => onRowClick && onRowClick(row)}>
              {columns.map(col => (
                <td key={col.key} class={col.align === 'right' ? 'num' : col.className || ''} data-label={col.label}>
                  {col.render ? col.render(row, page * (pageSize || 0) + i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pageSize && totalPages > 1 && (
        <div class="tbl-pager">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">‹</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">›</button>
        </div>
      )}
    </div>
  );
}
