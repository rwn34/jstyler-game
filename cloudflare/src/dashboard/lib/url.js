// Hash-based deep-link routing: #/tab?range=7d&player=pid

const TAB_ALIASES = {
  'watchlist':  'players?segment=flagged',
  'sessions':   'activity',
  'engagement': 'activity',
  'feed':       'live/feed',
  'alerts':     'live/alerts',
  'geo':        'platform/geo',
  'appversion': 'platform/versions',
  'sync':       'platform/sync',
};

export function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, qs] = hash.split('?');
  const [tab, subTab] = (path || '').split('/');
  const params = new URLSearchParams(qs || '');
  return {
    tab: tab || '', subTab: subTab || '',
    range: params.get('range') || '',
    player: params.get('player') || '',
    segment: params.get('segment') || '',
    cc: params.get('cc') || '',
    level: params.get('level') || '',
    version: params.get('version') || '',
    named: params.get('named') || '',
  };
}

export function writeHash(tab, subTab, range, player, segment, cc, level, version, named) {
  let hash = '#/' + (tab || '');
  if (subTab) hash += '/' + subTab;
  const params = [];
  if (range) params.push('range=' + range);
  if (segment) params.push('segment=' + encodeURIComponent(segment));
  if (player) params.push('player=' + encodeURIComponent(player));
  if (cc) params.push('cc=' + encodeURIComponent(cc));
  if (level) params.push('level=' + encodeURIComponent(level));
  if (version) params.push('version=' + encodeURIComponent(version));
  if (named) params.push('named=' + encodeURIComponent(named));
  if (params.length) hash += '?' + params.join('&');
  history.replaceState(null, '', hash);
}

export function applyAlias(tab) {
  const alias = TAB_ALIASES[tab];
  if (alias) {
    const newHash = '#/' + alias;
    history.replaceState(null, '', newHash);
    const [pathPart, qs] = alias.split('?');
    const [tabPart, subTab] = pathPart.split('/');
    const params = new URLSearchParams(qs || '');
    return { tab: tabPart, segment: params.get('segment') || '', subTab: subTab || '' };
  }
  return { tab, segment: '', subTab: '' };
}
