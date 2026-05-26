import { useState, useEffect } from 'preact/hooks';
import { loadedAt } from '../state.js';
import { fetchJson } from '../api.js';
import { fmtNum, fmtAgo, escapeHtml, truncatePid } from '../format.js';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { LoadingPane } from '../components/LoadingPane.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

export function Feedback({ force }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const cached = loadedAt.value.feedback;
    if (!force && cached && Date.now() - cached < 240000) return;
    setErr(null);
    fetchJson('/stats/feedback', { force })
      .then(data => { setD(data); loadedAt.value = { ...loadedAt.value, feedback: Date.now() }; })
      .catch(setErr);
  }, [force]);

  if (err) return <ErrorState error={err} onRetry={() => { loadedAt.value = { ...loadedAt.value, feedback: 0 }; setErr(null); setD(null); }} />;
  if (!d) return <LoadingPane />;

  const today = new Date().toISOString().slice(0, 10);
  const cols = [
    { key: 'serverTs', label: 'Time', sortable: true, sortType: 'date', render: r => fmtAgo(r.serverTs) },
    { key: 'pid', label: 'PID', render: r => truncatePid(r.pid), className: 'pid' },
    { key: 'name', label: 'Name', sortable: true, sortType: 'string', render: r => escapeHtml(r.name) || '(anon)' },
    { key: 'subject', label: 'Subject', render: r => escapeHtml(r.subject) || '—' },
    { key: 'email', label: 'Email', render: r => escapeHtml(r.email) || '—' },
    { key: 'content', label: 'Message', render: r => <span style="max-width:300px;display:inline-block;word-break:break-word">{escapeHtml(r.content)}</span>, exportFormat: v => v || '' },
  ];

  return (
    <>
      <div class="grid">
        <Card label="Total Feedback" val={fmtNum(d.total)} cls="gold" hint="all-time" />
        <Card label="Recent" val={fmtNum(d.items.length)} cls="live" hint="last 50" />
      </div>

      <h2>Recent Feedback</h2>
      <div class="panel scroll-x">
        {!d.items.length ? <EmptyState message="No feedback yet" /> : (
          <Table columns={cols} rows={d.items} defaultSort={{ key: 'serverTs', dir: 'desc' }} filterable filterPlaceholder="Search feedback…" exportable exportFilename={`ndj-feedback-${today}.csv`} />
        )}
      </div>
    </>
  );
}
