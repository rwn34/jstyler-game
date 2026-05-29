import { useState, useEffect, useCallback } from 'preact/hooks';
import { loadedAt } from '../state.js';
import { FilterIgnoredNotice } from '../components/FilterIgnoredNotice.jsx';
import { fetchJson } from '../api.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const STATUS_CHIPS = ['all', 'open', 'read', 'resolved'];

export function Feedback({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  function load() {
    setErr(null);
    fetchJson('/stats/feedback', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, feedback: Date.now() }; })
      .catch(setErr);
  }

  useEffect(() => {
    const cached = loadedAt.value.feedback;
    if (!force && cached && Date.now() - cached < 240000) return;
    load();
  }, [force]);

  const markStatus = useCallback(async (eventId, status, notes) => {
    await fetch('/admin/feedback/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ eventId, status, notes }),
    });
    // Optimistic update
    setD(prev => {
      if (!prev) return prev;
      const items = prev.items.map(it => it.id === eventId ? { ...it, status, notes: notes !== undefined ? notes : it.notes } : it);
      return { ...prev, items };
    });
  }, []);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, feedback: 0 }; setErr(null); setD(null); load(); }} />;
  if (!d) return <LoadingPane />;

  const filtered = statusFilter === 'all' ? d.items : d.items.filter(it => it.status === statusFilter);
  // Sort: open first, then by date desc
  const sorted = [...filtered].sort((a, b) => {
    const order = { open: 0, read: 1, resolved: 2 };
    const oa = order[a.status] ?? 1, ob = order[b.status] ?? 1;
    if (oa !== ob) return oa - ob;
    return (b.serverTs || 0) - (a.serverTs || 0);
  });

  const today = new Date().toISOString().slice(0, 10);
  const cols = [
    { key: 'serverTs', label: 'Time', sortable: true, sortType: 'date', render: r => fmtAgo(r.serverTs) },
    { key: 'status', label: 'Status', sortable: true, render: r => {
      const cls = r.status === 'resolved' ? 'green' : r.status === 'read' ? '' : 'warn';
      return <span class={`badge ${cls}`}>{r.status || 'open'}</span>;
    }},
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => escapeHtml(r.name) || '(anon)' },
    { key: 'subject', label: 'Subject', render: r => escapeHtml(r.subject) || '—' },
    { key: 'content', label: 'Message', render: r => <span style="max-width:200px;display:inline-block;word-break:break-word">{escapeHtml(r.content)}</span> },
    { key: '_actions', label: 'Actions', render: r => <FeedbackActions item={r} markStatus={markStatus} /> },
    { key: 'notes', label: 'Notes', render: r => <NotesCell item={r} markStatus={markStatus} /> },
  ];

  return (
    <>
      <FilterIgnoredNotice />
      <div class="grid">
        <Card label="Total Feedback" val={fmtNum(d.total)} cls="gold" hint="all-time" />
        <Card label="Open" val={fmtNum(d.items.filter(i => i.status === 'open').length)} cls="warn" />
        <Card label="Resolved" val={fmtNum(d.items.filter(i => i.status === 'resolved').length)} cls="live" />
      </div>

      <div class="filter-chips" style="margin-top:12px">
        {STATUS_CHIPS.map(s => (
          <button key={s} class={`chip${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)} aria-pressed={statusFilter === s}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div class="panel scroll-x">
        {!sorted.length ? <EmptyState message="No feedback matching filter" /> : (
          <Table columns={cols} rows={sorted} defaultSort={{ key: 'serverTs', dir: 'desc' }} filterable filterPlaceholder="Search feedback…" exportable exportFilename={`ndj-feedback-${today}.csv`} />
        )}
      </div>
    </>
  );
}

function FeedbackActions({ item, markStatus }) {
  const s = item.status || 'open';
  return (
    <div class="fb-actions">
      {s !== 'read' && <button style="color:#0ff;border-color:#0ff;background:rgba(0,255,255,.1)" onClick={() => markStatus(item.id, 'read')}>Mark Read</button>}
      {s !== 'resolved' && <button style="color:#0f8;border-color:#0f8;background:rgba(0,255,136,.1)" onClick={() => markStatus(item.id, 'resolved')}>Resolve</button>}
      {s !== 'open' && <button style="color:#fa0;border-color:#fa0;background:rgba(255,170,0,.1)" onClick={() => markStatus(item.id, 'open')}>Reopen</button>}
    </div>
  );
}

function NotesCell({ item, markStatus }) {
  const [val, setVal] = useState(item.notes || '');
  const onBlur = () => {
    if (val !== (item.notes || '')) {
      markStatus(item.id, item.status || 'open', val);
    }
  };
  return <textarea class="fb-notes" value={val} onInput={e => setVal(e.target.value)} onBlur={onBlur} aria-label="Notes for this feedback" />;
}
