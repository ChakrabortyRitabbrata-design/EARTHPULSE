import React from 'react';
import { Waves, MapPin, Calendar, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function FloodDetailView({ feature }) {
  if (!feature) return null;
  const p = feature.properties || {};

  return (
    <div className="space-y-4">
      {/* Title & Hazard Type */}
      <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sky-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Waves className="w-3.5 h-3.5" />
              <span>Inundation & GLOF Hazard Event</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {p.hazard_type || 'Glacial Flood Outburst'}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Associated Glacier: <span className="text-white font-medium">{p.glacier_name || 'Alpine Catchment'}</span>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300 font-mono text-xs font-semibold">
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

      {/* Observation Date & Footprint Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>EVENT DATE</span>
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base font-bold font-mono text-white truncate">{p.date || 'Historical Archive'}</div>
          <span className="text-[10px] text-slate-500 font-mono">Recorded Observation</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>INUNDATION ZONE</span>
            <AlertOctagon className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-base font-bold font-mono text-sky-300">~25.0 <span className="text-xs font-normal text-slate-400">km²</span></div>
          <span className="text-[10px] text-slate-500 font-mono">Radial Buffer Perimeter</span>
        </div>
      </div>

      {/* Geomorphic Hazard Triggers */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2.5">Recorded Physical Triggers</span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            {p.surge ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <span className="w-3.5 h-3.5 rounded-full bg-slate-800 inline-block" />}
            <span className={p.surge ? 'text-white' : 'text-slate-500'}>Glacier Surge</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            {p.calving ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> : <span className="w-3.5 h-3.5 rounded-full bg-slate-800 inline-block" />}
            <span className={p.calving ? 'text-white' : 'text-slate-500'}>Calving Episode</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            {p.avalanche ? <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> : <span className="w-3.5 h-3.5 rounded-full bg-slate-800 inline-block" />}
            <span className={p.avalanche ? 'text-white' : 'text-slate-500'}>Ice Avalanche</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            {p.debris_flow ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <span className="w-3.5 h-3.5 rounded-full bg-slate-800 inline-block" />}
            <span className={p.debris_flow ? 'text-white' : 'text-slate-500'}>Debris Flow</span>
          </div>
        </div>
      </div>

      {/* Description & Field Notes */}
      {p.description && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
            <span>FIELD DESCRIPTION & INVESTIGATOR LOG</span>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            "{p.description}"
          </p>
        </div>
      )}
    </div>
  );
}
