import React from 'react';
import { Filter, Search, RotateCcw, Play, Mountain } from 'lucide-react';

export const GLACIER_COUNTRIES = [
  { code: '', label: 'All Countries (Global)' },
  { code: 'CH', label: 'Switzerland (Alps)' },
  { code: 'NO', label: 'Norway (Scandinavia)' },
  { code: 'US', label: 'United States (Alaska/Cascades)' },
  { code: 'AT', label: 'Austria (Alps)' },
  { code: 'FR', label: 'France (Alps)' },
  { code: 'IT', label: 'Italy (Alps)' },
  { code: 'IS', label: 'Iceland' },
  { code: 'GL', label: 'Greenland' },
  { code: 'CL', label: 'Chile (Patagonia/Andes)' },
  { code: 'PE', label: 'Peru (Tropical Andes)' },
  { code: 'NP', label: 'Nepal (Himalayas)' },
  { code: 'IN', label: 'India (Himalayas)' },
  { code: 'SE', label: 'Sweden (Scandinavia)' },
  { code: 'CA', label: 'Canada (Rockies/Arctic)' },
  { code: 'NZ', label: 'New Zealand (Southern Alps)' },
  { code: 'AQ', label: 'Antarctica' },
];

export default function GlacierQueryBuilder({
  filters,
  onChange,
  onRunAnalysis,
  onReset,
  loading,
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          GLACIER QUERY BUILDER
        </span>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset to default parameters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
        {/* Country / Region */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            COUNTRY / REGION
          </label>
          <select
            value={filters.country || ''}
            onChange={(e) => onChange({ ...filters, country: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
          >
            {GLACIER_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Glacier Name Search */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            GLACIER NAME / QUERY
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. Adi Kailash, Silvretta, Aletsch..."
              value={filters.query || ''}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRunAnalysis && onRunAnalysis();
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 pl-7 text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
          </div>
        </div>

        {/* Glacier ID */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            WGMS GLACIER ID
          </label>
          <input
            type="number"
            placeholder="e.g. 3051, 1383, 408..."
            value={filters.glacierId || ''}
            onChange={(e) => onChange({ ...filters, glacierId: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRunAnalysis && onRunAnalysis();
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            OBSERVATION START
          </label>
          <input
            type="date"
            value={filters.startDate || '1950-01-01'}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            OBSERVATION END
          </label>
          <input
            type="date"
            value={filters.endDate || '2025-12-31'}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onRunAnalysis}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-600/30 transition-all disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{loading ? 'Executing Query...' : 'Run Glacier Analysis'}</span>
        </button>
      </div>
    </div>
  );
}
