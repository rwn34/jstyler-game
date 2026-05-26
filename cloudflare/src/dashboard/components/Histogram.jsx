export function Histogram({ buckets, markers, xFormatter }) {
  if (!buckets || buckets.length === 0) return <div style="color:#666;font-family:monospace;padding:12px">No data</div>;

  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const width = 500;
  const height = 140;
  const barGap = 2;
  const barW = (width - barGap * buckets.length) / buckets.length;
  const fmt = xFormatter || (ms => (ms / 1000).toFixed(1) + 's');

  // Marker positions (x coordinate)
  const minMs = buckets[0].from_ms;
  const maxMs = buckets[buckets.length - 1].to_ms;
  const range = maxMs - minMs || 1;
  function msToX(ms) { return ((ms - minMs) / range) * width; }

  return (
    <div class="histogram-wrap">
      <svg viewBox={`0 0 ${width} ${height + 24}`} style="width:100%;max-width:500px;height:auto">
        {buckets.map((b, i) => {
          const x = i * (barW + barGap);
          const h = (b.count / maxCount) * height;
          return (
            <g key={i}>
              <rect x={x} y={height - h} width={barW} height={h} rx={1} fill="rgba(0,255,255,0.7)">
                <title>{fmt(b.from_ms)} – {fmt(b.to_ms)}: {b.count}</title>
              </rect>
            </g>
          );
        })}
        {markers && Object.entries(markers).map(([key, val]) => {
          if (val == null) return null;
          const x = msToX(val);
          const color = key === 'p99' ? '#f44' : key === 'p75' ? '#fa0' : key === 'p50' ? '#0f8' : '#08f';
          return (
            <g key={key}>
              <line x1={x} y1={0} x2={x} y2={height} stroke={color} stroke-width={1.5} stroke-dasharray="3,2" />
              <text x={x} y={height + 14} fill={color} font-size="9" font-family="monospace" text-anchor="middle">{key} {fmt(val)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
