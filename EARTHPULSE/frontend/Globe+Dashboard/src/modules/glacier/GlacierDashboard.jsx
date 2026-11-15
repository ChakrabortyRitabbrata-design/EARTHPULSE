import React from 'react';
import {
  Mountain,
  TrendingDown,
  TrendingUp,
  Ruler,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
} from 'recharts';

export default function GlacierDashboard({
  selectedGlacier,
  glacierDetail,
  loadingDetail,
  onRequestAiReport,
  generatingReport,
}) {
  if (!selectedGlacier && !glacierDetail) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center text-slate-400 space-y-3">
        <Mountain className="w-10 h-10 text-cyan-400 mx-auto opacity-70 animate-pulse" />
        <div className="font-semibold text-slate-200 text-sm">No Glacier Selected</div>
        <p className="text-xs max-w-sm mx-auto text-slate-400">
          Select a glacier from the 3D globe or the WGMS Registry table to inspect mass balance trends, front variations, and telemetry.
        </p>
      </div>
    );
  }

  const data = glacierDetail || selectedGlacier;
  const name = data.name || `Glacier #${data.id}`;
  const id = data.id;
  const country = data.country || 'Unknown';
  const elevation = data.elevation ? `${data.elevation} m a.s.l.` : 'Elevation N/A';
  const lat = data.latitude ? Number(data.latitude).toFixed(4) : '—';
  const lon = data.longitude ? Number(data.longitude).toFixed(4) : '—';

  // Prepare mass balance time series for Recharts
  const mbRecords = data.mass_balance_series || data.mass_balance_observations || [];
  const chartDataMB = mbRecords
    .map((rec) => ({
      year: rec.year || rec.observation_year || rec.date,
      annual: rec.annual_balance !== undefined ? rec.annual_balance : rec.balance,
      winter: rec.winter_balance,
      summer: rec.summer_balance,
    }))
    .filter((d) => d.year && d.annual !== undefined && d.annual !== null)
    .sort((a, b) => Number(a.year) - Number(b.year));

  // Prepare front variation time series
  const fvRecords = data.front_variation_series || data.front_variation_observations || [];
  const chartDataFV = fvRecords
    .map((rec) => ({
      year: rec.year || rec.observation_year,
      variation: rec.variation !== undefined ? rec.variation : rec.front_variation,
    }))
    .filter((d) => d.year && d.variation !== undefined && d.variation !== null)
    .sort((a, b) => Number(a.year) - Number(b.year));

  return (
    <div className="space-y-4">
      {/* Target Glacier Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-800/60 rounded-lg p-4 shadow-lg shadow-cyan-950/30">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-base font-bold text-white tracking-wide">{name}</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                WGMS ID: {id}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-2">
              <span>ISO: <strong className="text-cyan-400">{country}</strong></span>
              <span>•</span>
              <span>Coordinates: <strong>{lat}°, {lon}°</strong></span>
              <span>•</span>
              <span>Elevation: <strong>{elevation}</strong></span>
            </div>
          </div>

          <button
            onClick={() => onRequestAiReport && onRequestAiReport(name, country, id)}
            disabled={generatingReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{generatingReport ? 'Analyzing with Gemini...' : 'AI Scientific Report'}</span>
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mass Balance Records</div>
            <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">
              {chartDataMB.length} verified
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Front Variation Records</div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
              {chartDataFV.length} recorded
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Latest Annual Balance</div>
            <div className={`text-sm font-bold font-mono mt-0.5 ${
              chartDataMB.length > 0 && chartDataMB[chartDataMB.length - 1].annual < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {chartDataMB.length > 0
                ? `${chartDataMB[chartDataMB.length - 1].annual} mm w.e.`
                : 'No series'}
            </div>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Latest Observation Year</div>
            <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
              {chartDataMB.length > 0 ? chartDataMB[chartDataMB.length - 1].year : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Chart 1: Annual Mass Balance Fluctuations */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Annual Mass Balance History (WGMS)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Unit: mm water equivalent (w.e.)</span>
        </div>

        {chartDataMB.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            No continuous annual mass balance time-series for this glacier in WGMS archives.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataMB} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val) => [`${val} mm w.e.`, 'Annual Balance']}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="annual">
                  {chartDataMB.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.annual < 0 ? '#f43f5e' : '#06b6d4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 2: Front Variation (Retreat / Advance) */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200">
              Front Variation & Terminus Fluctuations
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Unit: Meters (relative)</span>
        </div>

        {chartDataFV.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono text-xs">
            No terminus front variation measurements registered.
          </div>
        ) : (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataFV} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val) => [`${val} m`, 'Front Variation']}
                />
                <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                <Bar dataKey="variation">
                  {chartDataFV.map((entry, index) => (
                    <Cell
                      key={`fv-cell-${index}`}
                      fill={entry.variation < 0 ? '#fb7185' : '#34d399'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Scientific Notes & Data Quality Notice */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-400 font-mono flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-300">WGMS Scientific Quality Convention:</strong> Measurements are sourced from the World Glacier Monitoring Service (WGMS). Individual mass balances reflect local topographic and climatic dynamics; the sum of individual glacier mass balances must not be treated as a national total mass loss. Gaps represent unmeasured observation years rather than zero-balance states.
        </div>
      </div>
    </div>
  );
}
