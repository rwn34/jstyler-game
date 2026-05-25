import { useRef, useEffect } from 'preact/hooks';
import uPlot from 'uplot';

export function LineChart({ series, labels, height = 140, colorPrimary = '#0ff', colorSecondary = '#f44' }) {
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
        { stroke: '#666', grid: { stroke: 'rgba(255,255,255,0.05)' }, ticks: { stroke: 'rgba(255,255,255,0.05)' }, font: '9px monospace', labelFont: '9px monospace' },
        { stroke: '#666', grid: { stroke: 'rgba(255,255,255,0.05)' }, ticks: { stroke: 'rgba(255,255,255,0.05)' }, font: '9px monospace', labelFont: '9px monospace' },
      ],
      series: [
        {},
        { stroke: colorPrimary, width: 2, label: labels?.[0] || 'A' },
        ...(series.length > 2 ? [{ stroke: colorSecondary, width: 2, dash: [4, 3], label: labels?.[1] || 'B' }] : []),
      ],
    };

    chartRef.current = new uPlot(opts, series, elRef.current);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [series, height, colorPrimary, colorSecondary]);

  return <div ref={elRef} />;
}
