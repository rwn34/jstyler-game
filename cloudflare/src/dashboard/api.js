import { range as rangeSignal, currentFilters } from './state.js';

const API = new URLSearchParams(window.location.search).get('api') || window.location.origin;

export function withFilters(path) {
  const f = currentFilters.value;
  const params = [];
  if (f.cc) params.push('cc=' + encodeURIComponent(f.cc));
  if (f.level) params.push('level=' + encodeURIComponent(f.level));
  if (f.version) params.push('version=' + encodeURIComponent(f.version));
  if (f.named) params.push('named=' + encodeURIComponent(f.named));
  if (params.length === 0) return path;
  return path + (path.includes('?') ? '&' : '?') + params.join('&');
}

export async function fetchJson(path, { range, force } = {}) {
  const r = range || rangeSignal.value;
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  const url = API + withFilters(path) + sep + 'range=' + r + (force ? '&force=1' : '');
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 401) { location.href = '/'; throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j.data;
}

export async function postJson(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  if (res.status === 401) { location.href = '/'; throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j.data;
}

export async function getReferrals(pid, { force } = {}) {
  const path = pid ? '/admin/referrals?pid=' + encodeURIComponent(pid) : '/admin/referrals';
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  const url = API + path + sep + 'range=' + rangeSignal.value + (force ? '&force=1' : '');
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 401) { location.href = '/'; throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j.data;
}
