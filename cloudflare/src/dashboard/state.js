import { signal } from '@preact/signals';

export const range = signal(localStorage.getItem('ndj_range') || '2d');
export const currentTab = signal('overview');
export const searchQuery = signal('');
export const currentPlayerPid = signal(null);
export const currentSegment = signal(''); // segment chip filter (e.g. 'flagged')
export const loadedAt = signal({}); // { tabName: timestamp }

// Persist range changes
range.subscribe(v => localStorage.setItem('ndj_range', v));
