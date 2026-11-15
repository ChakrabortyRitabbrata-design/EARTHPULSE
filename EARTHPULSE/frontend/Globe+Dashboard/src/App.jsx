import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import LandingView from './components/LandingView';
import QuickJumpNav from './components/QuickJumpNav';
import MapLegend from './components/MapLegend';
import EarthGlobe from './globe/EarthGlobe';
import GlacierQueryBuilder from './modules/glacier/GlacierQueryBuilder';
import ThermalQueryBuilder from './modules/thermal/ThermalQueryBuilder';
import UnifiedAnalysisReport from './dashboard/UnifiedAnalysisReport';
import AiIntelligenceView from './modules/ai/AiIntelligenceView';
import { useEarthpulseData } from './hooks/useEarthpulseData';

export default function App() {
  const {
    activeView,
    setActiveView,
    activeModule,
    setActiveModule,
    backendConnected,
    isWorkflowRunning,
    workflowProgress,
    error,
    availableCountries,

    // Glacier Module
    glacierFilters,
    setGlacierFilters,
    glacierPage,
    setGlacierPage,
    glacierPageSize,
    glacierList,
    glacierTotal,
    glacierGeoJSON,
    selectedGlacier,
    glacierDetail,
    regionalGlacierStats,
    handleSelectGlacier,
    runGlacierQuery,
    resetGlacierFilters,

    // Thermal Module
    thermalFilters,
    setThermalFilters,
    thermalPage,
    setThermalPage,
    thermalPageSize,
    thermalDetections,
    thermalTotal,
    thermalGeoJSON,
    selectedThermal,
    thermalAnalysis,
    handleSelectThermal,
    runThermalQuery,
    resetThermalFilters,

    // Unified Cesium Selection
    selectedFeature,
    setSelectedFeature,
    clearSelection,
    handleQuickJump,

    // AI Intelligence
    aiReport,
    refreshAll,
    hasRunAnalysis,
  } = useEarthpulseData();

  // Layer visibility state
  const [glacierLayerVisible, setGlacierLayerVisible] = useState(true);
  const [thermalLayerVisible, setThermalLayerVisible] = useState(true);
  const [showQueryBuilder, setShowQueryBuilder] = useState(true);

  // 4K Orbital Scrollytelling Landing Page State
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'dashboard' || window.location.hash === '#dashboard') {
        return false;
      }
    }
    return true; // Default view is the Landing Page
  });

  if (showLanding) {
    return (
      <LandingView
        onEnterMission={() => {
          setShowLanding(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', '#dashboard');
          }
        }}
      />
    );
  }

  return (
    <div className="app-container w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Tactical Command Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        activeModule={activeModule}
        onModuleChange={(mod) => {
          setActiveModule(mod);
          setActiveView('split');
        }}
        backendConnected={backendConnected}
        isRefreshing={isWorkflowRunning}
        onRefresh={refreshAll}
        onOpenLanding={() => {
          setShowLanding(true);
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }}
      />

      {/* 2. Quick-Jump Geographical Navigation Strip */}
      <QuickJumpNav
        activeModule={activeModule}
        onJump={handleQuickJump}
      />

      {/* 3. Main Workspace */}
      {activeView === 'ai' ? (
        <div className="flex-1 overflow-y-auto bg-slate-950 no-scrollbar p-4">
          <AiIntelligenceView
            prefillQuery={
              activeModule === 'glaciers'
                ? selectedGlacier
                  ? `Evaluate mass balance fluctuations for ${selectedGlacier.name} in ${selectedGlacier.country}`
                  : 'Analyze mass balance retreat trends for Alpine glaciers in Switzerland'
                : `Analyze MODIS active fire and thermal anomaly detections in ${thermalFilters.country} for ${thermalFilters.year}`
            }
            prefillCountry={activeModule === 'glaciers' ? glacierFilters.country : thermalFilters.country}
            prefillGlacierId={selectedGlacier?.id}
          />
        </div>
      ) : (
        <main className="workspace-split flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          {/* LEFT 50%: Interactive CesiumJS 3D Earth */}
          <section
            aria-label="Cesium 3D Globe"
            className="globe-panel w-full md:w-1/2 h-1/2 md:h-full relative border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950 flex flex-col"
          >
            <EarthGlobe
              activeModule={activeModule}
              glacierGeoJSON={glacierGeoJSON}
              thermalGeoJSON={thermalGeoJSON}
              selectedFeature={selectedFeature}
              onSelectFeature={(feat) => {
                setSelectedFeature(feat);
                if (feat.module === 'glacier' || activeModule === 'glaciers') {
                  handleSelectGlacier(feat, false);
                } else {
                  handleSelectThermal(feat, false);
                }
              }}
              onClearSelection={clearSelection}
              glacierLayerVisible={glacierLayerVisible}
              thermalLayerVisible={thermalLayerVisible}
              loading={isWorkflowRunning}
            />

            {/* Map Legend Overlay */}
            <MapLegend
              activeModule={activeModule}
              glacierLayerVisible={glacierLayerVisible}
              setGlacierLayerVisible={setGlacierLayerVisible}
              thermalLayerVisible={thermalLayerVisible}
              setThermalLayerVisible={setThermalLayerVisible}
              totalGlaciersCount={glacierGeoJSON?.features?.length || 0}
              totalThermalCount={thermalGeoJSON?.features?.length || 0}
            />
          </section>

          {/* RIGHT 50%: Dynamic Analytical Dashboard & Report with independent scroll */}
          <section
            aria-label="Environmental Analytics Dashboard"
            className="dashboard-panel w-full md:w-1/2 h-1/2 md:h-full relative bg-slate-950 flex flex-col overflow-y-auto p-4 space-y-4 no-scrollbar"
          >
            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono">
                <strong>API Notice:</strong> {error}
              </div>
            )}

            {/* Optional Collapsible Query Controls */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                Scientific Workspace Dashboard
              </span>
              <button
                onClick={() => setShowQueryBuilder(!showQueryBuilder)}
                className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 transition-colors"
              >
                {showQueryBuilder ? 'Hide Query Parameters' : 'Custom Query Parameters'}
              </button>
            </div>

            {showQueryBuilder && (
              activeModule === 'glaciers' ? (
                <GlacierQueryBuilder
                  filters={glacierFilters}
                  onChange={setGlacierFilters}
                  onRunAnalysis={runGlacierQuery}
                  onReset={resetGlacierFilters}
                  loading={isWorkflowRunning}
                />
              ) : (
                <ThermalQueryBuilder
                  filters={thermalFilters}
                  onChange={setThermalFilters}
                  onRunAnalysis={runThermalQuery}
                  onReset={resetThermalFilters}
                  availableCountries={availableCountries}
                  loading={isWorkflowRunning}
                />
              )
            )}

            {/* B. Unified Analysis Report & Visualizations */}
            <UnifiedAnalysisReport
              activeModule={activeModule}
              isWorkflowRunning={isWorkflowRunning}
              workflowProgress={workflowProgress}
              hasRunAnalysis={hasRunAnalysis}
              onRunAnalysis={activeModule === 'glaciers' ? runGlacierQuery : runThermalQuery}
              // Glacier Data
              glacierList={glacierList}
              glacierTotal={glacierTotal}
              glacierPage={glacierPage}
              glacierPageSize={glacierPageSize}
              onGlacierPageChange={setGlacierPage}
              selectedGlacier={selectedGlacier}
              glacierDetail={glacierDetail}
              regionalGlacierStats={regionalGlacierStats}
              glacierFilters={glacierFilters}
              onSelectGlacier={handleSelectGlacier}
              // Thermal Data
              thermalDetections={thermalDetections}
              thermalTotal={thermalTotal}
              thermalPage={thermalPage}
              thermalPageSize={thermalPageSize}
              onThermalPageChange={setThermalPage}
              selectedThermal={selectedThermal}
              thermalAnalysis={thermalAnalysis}
              thermalFilters={thermalFilters}
              onSelectThermal={handleSelectThermal}
              // AI Report Data
              aiReport={aiReport}
              error={error}
            />
          </section>
        </main>
      )}
    </div>
  );
}
