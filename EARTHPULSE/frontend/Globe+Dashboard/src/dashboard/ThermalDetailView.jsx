import React from 'react';
import { Flame, Satellite, Sun, Moon, ShieldCheck, Thermometer, MapPin, Gauge } from 'lucide-react';

export default function ThermalDetailView({ feature }) {
  if (!feature) return null;
  const p = feature.properties || {};

  const typeLabels = {
    0: 'Presumed Vegetation Fire',
    1: 'Active Volcano',
    2: 'Other Static Land Source',
    3: 'Offshore Flare / Emission',
  };

  const typeName = typeLabels[p.type] || `Classification Code: ${p.type ?? 'N/A'}`;
  const frpVal = p.frp !== null && p.frp !== undefined ? Number(p.frp).toFixed(1) : 'N/A';
  const brVal = p.brightness ? Number(p.brightness).toFixed(1) : 'N/A';
  const t31Val = p.bright_t31 ? Number(p.bright_t31).toFixed(1) : 'N/A';
  const confVal = p.confidence !== null && p.confidence !== undefined ? p.confidence : 'N/A';

  return (
    <div className="space-y-4">
      {/* Title & Classification Banner */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4 backdrop-blur-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span>NASA FIRMS MODIS Radiant Anomaly</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {typeName}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Acquisition: {p.acq_date || 'N/A'} at {p.acq_time || 'N/A'} UTC
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold">
            {p.country || 'N/A'}
          </span>
        </div>

        {/* Spatial Coordinates & Pixel Resolution */}
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

      {/* Radiometric & Energetic Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>RADIATIVE POWER</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">{frpVal} <span className="text-xs font-normal text-slate-400">MW</span></div>
          <span className="text-[10px] text-slate-500 font-mono">Fire Radiative Power (FRP)</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>BRIGHTNESS CH 21</span>
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-300">{brVal} <span className="text-xs font-normal text-slate-400">K</span></div>
          <span className="text-[10px] text-slate-500 font-mono">Mid-IR Radiance (3.96 µm)</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>BACKGROUND T31</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">{t31Val} <span className="text-xs font-normal text-slate-400">K</span></div>
          <span className="text-[10px] text-slate-500 font-mono">Thermal Infrared (11.0 µm)</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>ALGORITHM CONF.</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">{confVal}%</div>
          <span className="text-[10px] text-slate-500 font-mono">Detection Quality Tier</span>
        </div>
      </div>

      {/* Satellite Platform & Orbital Timing */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Satellite className="w-4 h-4 text-cyan-400" />
          <span>SATELLITE:</span>
          <span className="font-semibold text-white uppercase">{p.satellite || 'MODIS'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          {p.daynight === 'D' ? (
            <span className="flex items-center gap-1 text-amber-300"><Sun className="w-3.5 h-3.5" /> Daytime Orbit</span>
          ) : (
            <span className="flex items-center gap-1 text-blue-300"><Moon className="w-3.5 h-3.5" /> Nighttime Orbit</span>
          )}
        </div>
      </div>

      {/* Scientific Guidance Note */}
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 font-mono leading-relaxed">
        <strong className="text-slate-200">Scientific Context:</strong> MODIS pixels observe a 1 km² footprint. Low confidence or type-2 detections indicate static or localized heat emissions and should not be inferred as uncontained wildfires without ground corroboration.
      </div>
    </div>
  );
}
