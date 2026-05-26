// Hash-based deep-link routing: #/tab?range=7d&player=pid

export function parseHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, qs] = hash.split('?');
  const params = new URLSearchParams(qs || '');
  return { tab: path || '', range: params.get('range') || '', player: params.get('player') || '' };
}

export function writeHash(tab, range, player) {
  let hash = '#/' + (tab || '');
  const params = [];
  if (range) params.push('range=' + range);
  if (player) params.push('player=' + encodeURIComponent(player));
  if (params.length) hash += '?' + params.join('&');
  history.replaceState(null, '', hash);
}
