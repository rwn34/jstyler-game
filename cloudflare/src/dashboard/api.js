import { range as rangeSignal } from './state.js';

const API = new URLSearchParams(window.location.search).get('api') || window.location.origin;

export async function fetchJson(path, { range, force } = {}) {
  const r = range || rangeSignal.value;
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  const url = API + path + sep + 'range=' + r + (force ? '&force=1' : '');
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 401) { location.href = '/'; throw new Error('unauthorized'); }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'API error');
  return j.data;
}
