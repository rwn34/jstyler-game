import { useRef, useEffect } from 'preact/hooks';
import uPlot from 'uplot';

export function AreaChart({ series, height = 100, color = '#0ff' }) {
  const elRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || !series || !series[0] || series[0].length < 2) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const opts = {
      width: elRef.current.clientWidth || 760,
      height,
      cursor: { show: true },
      scales: { x: { time: true }, y: { auto: true } },
      axes: [
        { stroke: '#666', grid: { stroke: 'rgba(255,255,255,0.05)' }, font: '9px monospace' },
        { stroke: '#666', grid: { stroke: 'rgba(255,255,255,0.05)' }, font: '9px monospace' },
      ],
      series: [
        {},
        { stroke: color, width: 2, fill: color + '1a', label: 'Balance' },
      ],
    };

    chartRef.current = new uPlot(opts, series, elRef.current);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [series, height, color]);

  return <div ref={elRef} />;
}
