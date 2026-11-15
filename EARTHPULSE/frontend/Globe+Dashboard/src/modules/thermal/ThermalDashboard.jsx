import React from 'react';
import {
  Flame,
  Activity,
  AlertTriangle,
  Sparkles,
  Info,
  Sun,
  Moon,
  Satellite,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

export default function ThermalDashboard({
  analysisData,
  selectedDetection,
  country = 'Singapore',
  year = 2025,
  onRequestAiReport,
  generatingReport,
}) {
  const analysis = analysisData || {};
  const stats = analysis.thermal_analysis || {};
  const geo = analysis.geographic_analysis || {};
  const temporal = analysis.temporal_analysis || {};
  const conf = analysis.confidence_analysis || {};
  const sat = analysis.satellite_analysis || {};
  const totalDetections = analysis.total_detections || 0;

  // Format daily/monthly detection trend for Recharts
  const trendData = (temporal.monthly_distribution || temporal.daily_distribution || []).map((t) => ({
    label: t.month || t.date || t.period,
    count: t.count || t.detections || 0,
  }));

  // Format satellite comparison for Recharts
  const satData = [
    { name: 'Terra (EOS AM-1)', value: sat.terra_count || 0, color: '#10b981' },
    { name: 'Aqua (EOS PM-1)', value: sat.aqua_count || 0, color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  // Confidence distribution
  const confData = [
    { name: 'High (>=80%)', count: conf.high_confidence_count || 0, color: '#ef4444' },
    { name: 'Nominal (30-79%)', count: conf.nominal_confidence_count || 0, color: '#f59e0b' },
    { name: 'Low (<30%)', count: conf.low_confidence_count || 0, color: '#64748b' },
  ].filter((d) => d.count > 0);

  return (
    <div className="space-y-4">
      {/* Target Regional Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-800/60 rounded-lg p-4 shadow-lg shadow-amber-950/30">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-base font-bold text-white tracking-wide">
                {country.replace(/_/g, ' ')} Active-Fire & Thermal Intelligence
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                NASA FIRMS {year}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
              <span>Collection: <strong>MODIS C6.1</strong></span>
              <span>•</span>
              <span>Detections: <strong className="text-amber-400">{totalDetections}</strong></span>
              <span>•</span>
              <span>Terra/Aqua Dual Satellite Pass</span>
            </div>
          </div>

          <button
            onClick={() => onRequestAiReport && onRequestAiReport(`Thermal anomalies in ${country} for ${year}`, country)}
            disabled={generatingReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generatingReport ? 'Analyzing with Gemini...' : 'AI Scientific Report'}</span>
          </button>
        </div>

        {/* Quick Analytical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Radiant Power</div>
            <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
              {stats.mean_frp !== undefined ? `${stats.mean_frp} MW` : '—'}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Max Radiant Power</div>
            <div className="text-sm font-bold text-rose-400 font-mono mt-0.5">
              {stats.max_frp !== undefined ? `${stats.max_frp} MW` : '—'}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Brightness</div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
              {stats.mean_brightness !== undefined ? `${stats.mean_brightness} K` : '—'}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Spatial Clusters</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
              {analysis.hotspot_clusters ? `${analysis.hotspot_clusters.length} DBSCAN` : 'Point Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Feature Card (if user clicked a detection) */}
      {selectedDetection && (
        <div className="bg-slate-900 border border-amber-600/80 rounded-lg p-3.5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Selected Detection Telemetry</span>
            </div>
            <span className="font-mono text-[10px] text-amber-400 px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800">
              {selectedDetection.satellite || 'MODIS'} • {selectedDetection.daynight === 'D' ? 'Day' : 'Night'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">COORDINATES</span>
              <strong className="text-slate-200">
                {selectedDetection.latitude ? Number(selectedDetection.latitude).toFixed(4) : '—'}°,{' '}
                {selectedDetection.longitude ? Number(selectedDetection.longitude).toFixed(4) : '—'}°
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">ACQUISITION</span>
              <strong className="text-slate-200">
                {selectedDetection.acq_date} {selectedDetection.acq_time ? `${selectedDetection.acq_time}Z` : ''}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">RADIANT POWER</span>
              <strong className="text-amber-400">
                {selectedDetection.frp !== undefined ? `${Number(selectedDetection.frp).toFixed(1)} MW` : '—'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">CONFIDENCE</span>
              <strong className="text-rose-400">
                {selectedDetection.confidence !== undefined ? `${selectedDetection.confidence}%` : '—'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Chart 1: Detection Trends Over Time */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Temporal Detection Frequency (MODIS FIRMS)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Observations per period</span>
        </div>

        {trendData.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            Run analysis to populate temporal frequency distribution.
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val) => [`${val} detections`, 'Count']}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grid of Two Sub-Charts: Sensor Breakdown & Confidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sensor Comparison */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Terra vs Aqua Sensor Distribution
            </h4>
          </div>
          {satData.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">No sensor data available</div>
          ) : (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={satData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {satData.map((entry, index) => (
                      <Cell key={`sat-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Confidence Tier Distribution */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-rose-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Observation Confidence Breakdown
            </h4>
          </div>
          {confData.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">No confidence metrics</div>
          ) : (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {confData.map((entry, index) => (
                      <Cell key={`conf-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Scientific Caution Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 font-mono flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">NASA FIRMS Scientific Distinction:</strong> MODIS active-fire detections measure mid-infrared and thermal radiant emissions (FRP) and do not represent confirmed wildfire catastrophes. Observations may include agricultural burning, industrial flares, controlled burns, and geothermal signatures. MODIS thermal anomalies do not predict seismic or earthquake phenomena.
        </div>
      </div>
    </div>
  );
}
