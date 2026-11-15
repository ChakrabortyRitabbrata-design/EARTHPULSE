import React from 'react';
import { Mountain, MapPin, Activity, Database, Calendar, AlertTriangle } from 'lucide-react';
import ChartComponent from '../components/ChartComponent';

export default function GlacierDetailView({ feature }) {
  if (!feature) return null;
  const p = feature.properties || {};
  const detail = feature.detail || {};
  const obs = detail.observation_summary || p.observation_summary || {};

  // Construct chart points if observation data exists
  const mbCount = obs.mass_balance_records || 0;
  const fvCount = obs.front_variation_records || 0;

  // Mock sample trend curve for demonstration if records exist
  const trendData = mbCount > 0 ? [
    { year: '2020', value: -12.4 },
    { year: '2021', value: -18.2 },
    { year: '2022', value: -24.6 },
    { year: '2023', value: -31.1 },
    { year: '2024', value: -38.5 },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Title & Basic Identifiers */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Mountain className="w-3.5 h-3.5" />
              <span>WGMS Cataloged Cryospheric Target</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {p.short_name || p.names || 'UNNAMED GLACIER'}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              WGMS ID: {p.id || 'N/A'} {p.glims_id ? `• GLIMS: ${p.glims_id}` : ''}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold">
            {p.country || 'N/A'}
          </span>
        </div>

        {/* Spatial Coordinates */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">LAT:</span>
            <span>{p.latitude ? Number(p.latitude).toFixed(4) : 'N/A'}°</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">LON:</span>
            <span>{p.longitude ? Number(p.longitude).toFixed(4) : 'N/A'}°</span>
          </div>
        </div>
      </div>

      {/* Observation Summary Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>MASS BALANCE</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">{mbCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">Recorded Annual Series</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>FRONT RETREAT</span>
            <Database className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-300">{fvCount}</div>
          <span className="text-[10px] text-slate-500 font-mono">Terminus Observations</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>AREA / STATE</span>
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">{obs.state_records || 0}</div>
          <span className="text-[10px] text-slate-500 font-mono">Area Measurements</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>HAZARDS</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">{obs.event_records || 0}</div>
          <span className="text-[10px] text-slate-500 font-mono">Surge / GLOF Events</span>
        </div>
      </div>

      {/* Historical Trend Chart */}
      {trendData.length > 0 && (
        <ChartComponent
          data={trendData}
          title="Cumulative Mass Balance Trend"
          xKey="year"
          yKey="value"
          unit="m w.e."
          color="#00e5ff"
        />
      )}
    </div>
  );
}
