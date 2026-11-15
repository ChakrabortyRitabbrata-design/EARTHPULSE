import React from 'react';
import { Mountain, Flame, Waves, Filter, RefreshCw, AlertCircle, Database, CheckCircle2, ChevronRight, X } from 'lucide-react';
import GlacierDetailView from './GlacierDetailView';
import ThermalDetailView from './ThermalDetailView';
import FloodDetailView from './FloodDetailView';
import AiReportView from './AiReportView';

export default function DashboardPanel({
  activeModule,
  setActiveModule,
  selectedFeature,
  onClearSelection,
  summaryData,
  loading,
  error,
  onRefresh,
  glacierFilters,
  setGlacierFilters,
  thermalFilters,
  setThermalFilters,
  floodFilters,
  setFloodFilters,
  aiReport,
  aiLoading,
  onRequestAiReport,
}) {
  return (
    <aside className="w-full h-full bg-slate-950/95 border-l border-slate-800 flex flex-col overflow-hidden backdrop-blur-xl">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            EARTHPULSE INTELLIGENCE
          </h1>
          <p className="text-[11px] font-mono text-slate-400">Synchronized Planetary Observational Dashboard</p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          title="Reload active dataset"
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Module Selector Tabs */}
      <div className="grid grid-cols-3 gap-1 p-3 bg-slate-900/60 border-b border-slate-800/60 shrink-0">
        <button
          onClick={() => setActiveModule('glacier')}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-mono font-medium transition-all ${
            activeModule === 'glacier'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Mountain className="w-4 h-4" />
          <span>GLACIERS</span>
        </button>

        <button
          onClick={() => setActiveModule('thermal')}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-mono font-medium transition-all ${
            activeModule === 'thermal'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>FIRE / MODIS</span>
        </button>

        <button
          onClick={() => setActiveModule('flood')}
          className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-mono font-medium transition-all ${
            activeModule === 'flood'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm shadow-sky-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Waves className="w-4 h-4" />
          <span>FLOOD / GLOF</span>
        </button>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Module Overview Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>DATASET INVENTORY STATUS</span>
            </div>
            {loading && <span className="text-cyan-400 animate-pulse text-[10px]">STREAMING DATA...</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono block">ACTIVE POINTS</span>
              <span className="text-lg font-bold font-mono text-white">
                {summaryData?.totalFeatures?.toLocaleString() || '0'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono block">COVERAGE</span>
              <span className="text-lg font-bold font-mono text-cyan-300">
                {activeModule === 'glacier' ? '214k+' : activeModule === 'thermal' ? '210 Ctr' : '1.8k+'}
              </span>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 font-mono block">YEARS</span>
              <span className="text-lg font-bold font-mono text-emerald-300">
                {activeModule === 'thermal' ? '2024-25' : '1725-24'}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Geographical Selection Card */}
        {selectedFeature ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                SELECTED GEOGRAPHICAL FEATURE
              </span>
              <button
                onClick={onClearSelection}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Clear Selection</span>
              </button>
            </div>

            {/* Detailed Component per Module */}
            {activeModule === 'glacier' && <GlacierDetailView feature={selectedFeature} />}
            {activeModule === 'thermal' && <ThermalDetailView feature={selectedFeature} />}
            {activeModule === 'flood' && <FloodDetailView feature={selectedFeature} />}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-1.5">
            <p className="text-xs font-medium text-slate-300">No Geographical Feature Selected</p>
            <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
              Click any geographical point on the 3D globe to highlight its area boundary and explore empirical data metrics.
            </p>
          </div>
        )}

        {/* AI Scientific Intelligence Report */}
        <AiReportView
          report={aiReport}
          loading={aiLoading}
          onRequestReport={onRequestAiReport}
          activeModule={activeModule}
          selectedFeature={selectedFeature}
        />
      </div>

      {/* Footer / System Health Status */}
      <div className="p-2.5 px-4 border-t border-slate-800/80 bg-slate-950 text-[10px] font-mono text-slate-500 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>FASTAPI BACKEND CONNECTED</span>
        </div>
        <span>EPSG:4326 WGS84</span>
      </div>
    </aside>
  );
}
