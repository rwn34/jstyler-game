const TZ = 'Asia/Bangkok';

export function fmtNum(n) { return (n || 0).toLocaleString(); }
export function fmtMs(ms) { if (!ms) return '—'; return (ms / 1000).toFixed(2) + 's'; }
export function fmtMin(m) { if (!m) return '0m'; if (m < 60) return Math.round(m) + 'm'; return Math.floor(m / 60) + 'h ' + Math.round(m % 60) + 'm'; }
export function fmtTime(ts) { return new Date(ts).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
export function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-GB', { timeZone: TZ, month: 'short', day: 'numeric' }); }
export function fmtDateTime(ts) { return new Date(ts).toLocaleString('en-GB', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }); }
export function fmtAgo(ts) { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return s + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }
export function truncatePid(pid) { return pid ? pid.slice(0, 12) + (pid.length > 12 ? '…' : '') : '—'; }
export function escapeHtml(str) { if (str == null) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
