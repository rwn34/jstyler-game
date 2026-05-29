import { useState, useCallback } from 'preact/hooks';
import { range } from '../state.js';
import { Table } from './Table.jsx';
import { EmptyState } from './EmptyState.jsx';

export function PlayersSection({ title, chips, exportFilenamePrefix }) {
  const [activeId, setActiveId] = useState(chips[0]?.id || '');

  const activeChip = chips.find(c => c.id === activeId) || chips[0];
  const data = activeChip?.data || [];
  const columns = activeChip?.columns || [];
  const defaultSort = activeChip?.defaultSort;
  const today = new Date().toISOString().slice(0, 10);
  const exportFilename = `${exportFilenamePrefix}-${activeId}-${range.value}-${today}.csv`;

  const onKeyDown = useCallback((e) => {
    const idx = chips.findIndex(c => c.id === activeId);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % chips.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + chips.length) % chips.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = chips.length - 1;
    else return;
    e.preventDefault();
    setActiveId(chips[next].id);
  }, [chips, activeId]);

  return (
    <section class="players-section">
      <h2>{title}</h2>
      <div class="chips" role="tablist" onKeyDown={onKeyDown} aria-label={`${title} views`}>
        {chips.map(c => (
          <button
            key={c.id}
            role="tab"
            aria-selected={activeId === c.id}
            tabIndex={activeId === c.id ? 0 : -1}
            class={`chip${activeId === c.id ? ' active' : ''}`}
            onClick={() => setActiveId(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div class="panel scroll-x">
        {data.length === 0 ? (
          <EmptyState message="No players" />
        ) : (
          <Table
            columns={columns}
            rows={data}
            defaultSort={defaultSort}
            filterable
            exportable
            exportFilename={exportFilename}
          />
        )}
      </div>
    </section>
  );
}
