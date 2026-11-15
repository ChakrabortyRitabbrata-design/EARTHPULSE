import React from 'react';
import { Filter, RotateCcw, Play, Flame, Satellite, Layers } from 'lucide-react';

export default function ThermalQueryBuilder({
  filters,
  onChange,
  onRunAnalysis,
  onReset,
  availableCountries = [],
  loading,
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          THERMAL ANOMALY QUERY BUILDER (MODIS)
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset filters to default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* Country */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            TARGET COUNTRY
          </label>
          <select
            value={filters.country || 'Singapore'}
            onChange={(e) => onChange({ ...filters, country: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            {availableCountries.length > 0 ? (
              availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, ' ')}
                </option>
              ))
            ) : (
              <>
                <option value="Singapore">Singapore</option>
                <option value="Australia">Australia</option>
                <option value="Brazil">Brazil</option>
                <option value="Canada">Canada</option>
                <option value="Indonesia">Indonesia</option>
                <option value="United_States">United States</option>
              </>
            )}
          </select>
        </div>

        {/* Observation Year */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            DATASET YEAR
          </label>
          <select
            value={filters.year || 2025}
            onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          >
            <option value={2025}>2025 (Active / Current)</option>
            <option value={2024}>2024 (Annual Archive)</option>
          </select>
        </div>

        {/* Satellite Platform */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            SATELLITE SENSOR
          </label>
          <select
            value={filters.satellite || ''}
            onChange={(e) => onChange({ ...filters, satellite: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            <option value="">All Sensors (Terra + Aqua)</option>
            <option value="Terra">Terra (EOS AM-1, 10:30 pass)</option>
            <option value="Aqua">Aqua (EOS PM-1, 13:30 pass)</option>
          </select>
        </div>

        {/* Day / Night Pass */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            ORBIT PASS (DAY/NIGHT)
          </label>
          <select
            value={filters.daynight || ''}
            onChange={(e) => onChange({ ...filters, daynight: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            <option value="">All Overpasses</option>
            <option value="D">Daytime Observations (D)</option>
            <option value="N">Nighttime Observations (N)</option>
          </select>
        </div>

        {/* Confidence Threshold */}
        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>MIN CONFIDENCE</span>
            <span className="text-amber-400 font-bold">{filters.minConfidence || 0}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minConfidence || 0}
            onChange={(e) => onChange({ ...filters, minConfidence: Number(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Minimum FRP (MW) */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            MIN FRP (MW)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="e.g. 5.0"
            value={filters.minFRP || ''}
            onChange={(e) => onChange({ ...filters, minFRP: e.target.value ? Number(e.target.value) : '' })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Date Range Start */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            START DATE (OPTIONAL)
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            END DATE (OPTIONAL)
          </label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Hotspot Clustering Controls (DBSCAN) */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
          <input
            type="checkbox"
            checked={!!filters.includeClustering}
            onChange={(e) => onChange({ ...filters, includeClustering: e.target.checked })}
            className="accent-amber-500 w-3.5 h-3.5 rounded"
          />
          <span className="font-mono text-[11px] text-amber-300">
            Enable DBSCAN Spatial Hotspot Clustering
          </span>
        </label>

        {filters.includeClustering && (
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>Radius: <strong>{filters.epsKm || 15} km</strong></span>
            <span>Min Points: <strong>{filters.minSamples || 3}</strong></span>
          </div>
        )}

        <button
          onClick={onRunAnalysis}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{loading ? 'Querying MODIS...' : 'Run Thermal Analysis'}</span>
        </button>
      </div>
    </div>
  );
}
