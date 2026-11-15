import React from 'react';
import { Activity, Flame, Mountain, Sparkles, Layers, RefreshCw, Radio, Rocket } from 'lucide-react';

export default function Header({
  activeView,
  onViewChange,
  activeModule,
  onModuleChange,
  backendConnected,
  isRefreshing,
  onRefresh,
  onOpenLanding,
}) {
  return (
    <header className="h-16 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Mission Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenLanding}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/40 hover:scale-105 transition-transform"
          title="Return to 4K Orbital Scrollytelling Experience"
        >
          <Activity className="w-5 h-5 text-white animate-pulse" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLanding}
              className="font-extrabold tracking-widest text-base bg-gradient-to-r from-cyan-400 via-blue-200 to-indigo-300 bg-clip-text text-transparent hover:opacity-80 transition-opacity text-left"
              title="Return to 4K Orbital Scrollytelling Experience"
            >
              EARTHPULSE
            </button>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold tracking-wider">
              GEOSPATIAL CORE
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
            <span>CesiumJS 3D</span>
            <span className="text-slate-600">•</span>
            <span>FastAPI Backend</span>
            <span className="text-slate-600">•</span>
            <span>Gemini 3.6 Flash</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Modes */}
      <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
        {/* Orbital Descent Intro */}
        {onOpenLanding && (
          <button
            onClick={onOpenLanding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/50 border border-cyan-800/50 transition-all"
            title="Return to 4K Orbital Descent Scrollytelling"
          >
            <Rocket className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline font-mono">Orbital Intro</span>
          </button>
        )}

        {/* Globe & Dashboard */}
        <button
          onClick={() => {
            onViewChange('split');
            if (activeModule === 'all') onModuleChange('glaciers');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeView === 'split' && activeModule === 'all'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Globe & Dashboard</span>
        </button>

        {/* Glacier Intelligence */}
        <button
          onClick={() => {
            onViewChange('split');
            onModuleChange('glaciers');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeModule === 'glaciers'
              ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-900/30 font-semibold'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/40'
          }`}
        >
          <Mountain className="w-3.5 h-3.5 text-cyan-400" />
          <span>Glacier Intelligence</span>
        </button>

        {/* Thermal Anomaly Intelligence */}
        <button
          onClick={() => {
            onViewChange('split');
            onModuleChange('thermal');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeModule === 'thermal'
              ? 'bg-amber-950/70 text-amber-300 border border-amber-700/60 shadow-sm shadow-amber-900/30 font-semibold'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/40'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Thermal Anomaly Intelligence</span>
        </button>

        {/* AI Intelligence */}
        <button
          onClick={() => onViewChange('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeView === 'ai'
              ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/60 shadow-sm shadow-indigo-900/30 font-semibold'
              : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Intelligence</span>
        </button>

        {/* Flood Monitoring — Future Module Only (Coming Soon) */}
        <div
          title="Flood Monitoring is currently under development. Historical GLOF datasets are being integrated."
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-500 cursor-not-allowed border border-dashed border-slate-800 opacity-60"
        >
          <span>Flood Monitoring</span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Coming Soon
          </span>
        </div>
      </nav>

      {/* Status Indicators & Controls */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] font-mono ${
            backendConnected
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
          }`}
          title={backendConnected ? 'FastAPI Backend Online & Synchronized' : 'FastAPI Backend Offline'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
            }`}
          />
          <span className="hidden md:inline font-semibold">
            {backendConnected ? 'API SYNCHRONIZED' : 'API DISCONNECTED'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Reload geospatial data"
          className="p-2 rounded border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white hover:border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>
    </header>
  );
}
