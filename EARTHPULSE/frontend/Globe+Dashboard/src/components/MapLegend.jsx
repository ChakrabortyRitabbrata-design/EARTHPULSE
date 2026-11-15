import React from 'react';
import { Layers, Flame, Mountain, Eye } from 'lucide-react';

export default function MapLegend({
  activeModule,
  glacierLayerVisible,
  setGlacierLayerVisible,
  thermalLayerVisible,
  setThermalLayerVisible,
  totalGlaciersCount = 0,
  totalThermalCount = 0,
}) {
  return (
    <div className="absolute bottom-6 left-6 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-lg p-3 text-xs shadow-2xl text-slate-300 w-64 select-none pointer-events-auto">
      <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          ACTIVE MAP LAYERS
        </span>
      </div>

      <div className="space-y-2">
        {/* Glacier Layer Toggle */}
        <div
          onClick={() => setGlacierLayerVisible && setGlacierLayerVisible(!glacierLayerVisible)}
          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
            glacierLayerVisible ? 'bg-cyan-950/40 text-cyan-300' : 'opacity-50 hover:opacity-75'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 border border-cyan-200 shadow-sm shadow-cyan-400/50" />
            <Mountain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-[11px]">WGMS Glaciers</span>
          </div>
          <span className="font-mono text-[10px] text-cyan-400/80 font-bold">
            {totalGlaciersCount} pts
          </span>
        </div>

        {/* Thermal Layer Toggle */}
        <div
          onClick={() => setThermalLayerVisible && setThermalLayerVisible(!thermalLayerVisible)}
          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
            thermalLayerVisible ? 'bg-amber-950/40 text-amber-300' : 'opacity-50 hover:opacity-75'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 shadow-sm shadow-amber-500/50" />
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-[11px]">MODIS Thermal Detections</span>
          </div>
          <span className="font-mono text-[10px] text-amber-400/80 font-bold">
            {totalThermalCount} pts
          </span>
        </div>
      </div>

      {/* Symbology Legend */}
      <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] space-y-1 text-slate-400 font-mono">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Glacier Registry
          </span>
          <span className="text-slate-500">WGMS FLUCT</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Radiant Anomaly
          </span>
          <span className="text-slate-500">Size ~ FRP (MW)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded border border-cyan-400 bg-cyan-500/30" /> Selected Focus
          </span>
          <span className="text-cyan-400">Boundary Reticle</span>
        </div>
      </div>
    </div>
  );
}
