import React from 'react';

/**
 * Lightweight SVG historical trend chart component
 * Renders verified numerical trends with no bloated external charting libraries.
 */
export default function ChartComponent({ data = [], title = 'Historical Trend', xKey = 'year', yKey = 'value', unit = '', color = '#00e5ff' }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-36 flex items-center justify-center border border-slate-800/80 rounded-xl bg-slate-900/40 text-xs text-slate-500 font-mono">
        NO CONTINUOUS TIME-SERIES DATA AVAILABLE
      </div>
    );
  }

  const values = data.map((d) => Number(d[yKey]) || 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Chart dimensions
  const width = 360;
  const height = 120;
  const padding = 20;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const normalizedY = (Number(d[yKey]) - minVal) / range;
    const y = height - padding - normalizedY * (height - 2 * padding);
    return { x, y, label: d[xKey], val: d[yKey] };
  });

  const pathData = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-300 font-medium uppercase tracking-wider">{title}</span>
        <span className="text-[11px] font-mono text-cyan-400">
          Range: {minVal.toFixed(1)} to {maxVal.toFixed(1)} {unit}
        </span>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          {/* Subtle grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(148, 163, 184, 0.15)" />

          {/* Area gradient under curve */}
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gradient fill */}
          {points.length > 1 && (
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
              fill={`url(#grad-${color})`}
            />
          )}

          {/* Line stroke */}
          <path d={pathData} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Point nodes */}
          {points.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="3" fill="#ffffff" stroke={color} strokeWidth="2" />
              <title>{`${pt.label}: ${pt.val} ${unit}`}</title>
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-3 mt-1">
          <span>{data[0]?.[xKey]}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.[xKey]}</span>}
          <span>{data[data.length - 1]?.[xKey]}</span>
        </div>
      </div>
    </div>
  );
}
