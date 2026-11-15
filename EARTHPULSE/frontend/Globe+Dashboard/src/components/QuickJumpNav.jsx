import React from 'react';
import { Compass, Globe2 } from 'lucide-react';

export const GLACIER_REGIONS = [
  { name: 'Alps (Silvretta)', lat: 46.85, lon: 10.08, height: 180000, country: 'CH', glacierId: 408, glacierName: 'SILVRETTA' },
  { name: 'Austria (Hintereis)', lat: 46.80, lon: 10.77, height: 180000, country: 'AT', glacierId: 491, glacierName: 'HINTEREIS F.' },
  { name: 'Norway (Storbreen)', lat: 61.57, lon: 8.13, height: 180000, country: 'NO', glacierId: 302, glacierName: 'STORBREEN' },
  { name: 'Alaska (Taku)', lat: 58.65, lon: -134.28, height: 220000, country: 'US', glacierId: 124, glacierName: 'TAKU' },
  { name: 'Sweden (Storglaciaeren)', lat: 67.90, lon: 18.57, height: 180000, country: 'SE', glacierId: 332, glacierName: 'STORGLACIAEREN' },
  { name: 'Himalayas', lat: 28.5, lon: 86.5, height: 750000, country: 'NP' },
  { name: 'Iceland', lat: 64.5, lon: -18.5, height: 450000, country: 'IS' },
  { name: 'Patagonia', lat: -48.0, lon: -73.5, height: 850000, country: 'CL' },
  { name: 'Greenland', lat: 72.0, lon: -40.0, height: 1800000, country: 'GL' },
  { name: 'Antarctica', lat: -78.0, lon: 0.0, height: 3500000, country: 'AQ' },
];

export const THERMAL_REGIONS = [
  { name: 'Singapore', lat: 1.35, lon: 103.82, height: 120000, country: 'Singapore' },
  { name: 'Australia', lat: -25.27, lon: 133.77, height: 2600000, country: 'Australia' },
  { name: 'Brazil', lat: -14.23, lon: -51.92, height: 3000000, country: 'Brazil' },
  { name: 'Canada', lat: 56.13, lon: -106.34, height: 3200000, country: 'Canada' },
  { name: 'Indonesia', lat: -0.78, lon: 113.92, height: 2200000, country: 'Indonesia' },
  { name: 'United States', lat: 37.09, lon: -95.71, height: 2800000, country: 'United_States' },
];

export default function QuickJumpNav({ activeModule, onJump }) {
  const regions = activeModule === 'thermal' ? THERMAL_REGIONS : GLACIER_REGIONS;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-3 bg-slate-900/60 border-b border-slate-800/80 text-xs no-scrollbar select-none">
      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 font-semibold shrink-0 mr-1">
        <Compass className="w-3.5 h-3.5 text-cyan-400" />
        <span>QUICK JUMP:</span>
      </div>
      {regions.map((reg) => (
        <button
          key={reg.name}
          onClick={() => onJump && onJump(reg)}
          className="px-2.5 py-1 rounded bg-slate-800/70 hover:bg-cyan-950/70 hover:text-cyan-300 hover:border-cyan-700/60 border border-slate-700/60 text-slate-300 text-[11px] font-mono whitespace-nowrap transition-all shadow-sm"
        >
          {reg.name}
        </button>
      ))}
    </div>
  );
}
