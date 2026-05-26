// Range comparison: compute delta % between current and previous period

import { signal } from '@preact/signals';
import { fetchJson } from '../api.js';
import { range as rangeSignal } from '../state.js';

export const compareEnabled = signal(localStorage.getItem('ndj_compare') === '1');

compareEnabled.subscribe(v => localStorage.setItem('ndj_compare', v ? '1' : '0'));

const RANGE_MS = { '1d': 86400000, '2d': 2*86400000, '3d': 3*86400000, '7d': 7*86400000, '14d': 14*86400000, '31d': 31*86400000 };

export function previousBefore() {
  const ms = RANGE_MS[rangeSignal.value];
  if (!ms) return null; // 'all' has no previous
  return Date.now() - ms;
}

export async function fetchWithCompare(path, { force } = {}) {
  const current = await fetchJson(path, { force });
  if (!compareEnabled.value) return { current, previous: null };
  const before = previousBefore();
  if (before == null) return { current, previous: null };
  const sep = path.indexOf('?') >= 0 ? '&' : '?';
  const prevPath = path + sep + 'before=' + before;
  try {
    const previous = await fetchJson(prevPath, { force });
    return { current, previous };
  } catch (_) {
    return { current, previous: null };
  }
}

export function computeDelta(current, previous) {
  if (previous == null || current == null) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
