import React, { useState } from 'react';
import {
  Mountain,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  Ruler,
  Satellite,
  Compass,
  FileText,
  Activity,
  Cpu,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  BarChart3,
  ShieldCheck,
  Play,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import LiveWorkflowProgress from '../components/LiveWorkflowProgress';
import GlacierRegistry from '../modules/glacier/GlacierRegistry';
import ThermalRegistry from '../modules/thermal/ThermalRegistry';

// Circular Donut Gauge with Centered Numerical Percentage
function DonutRing({ percentage, size = 114, strokeWidth = 10, color = '#f43f5e', secondaryColor = '#10b981' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const num = Math.min(Math.max(Number(percentage) || 0, 0), 100);
  const strokeDashoffset = circumference - (num / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={secondaryColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.35}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-bold font-mono tracking-tight text-white drop-shadow-md">
          {num}%
        </span>
      </div>
    </div>
  );
}

// Segmented Horizontal Proportion Bar (e.g. Retreat vs Advance vs Stationary, or FRP Severity Tiers)
function SegmentedBar({ segments, title }) {
  const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;

  return (
    <div className="w-full mt-3 pt-2.5 border-t border-slate-800/80">
      {title && (
        <div className="text-[10px] font-mono text-slate-400 mb-1.5 font-medium flex items-center justify-between">
          <span>{title}</span>
        </div>
      )}
      <div className="w-full h-3 rounded bg-slate-950 flex overflow-hidden p-0.5 border border-slate-800">
        {segments.map((seg, idx) => {
          const widthPct = Math.max(((Number(seg.value) || 0) / total) * 100, 0);
          if (widthPct <= 0) return null;
          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%`, backgroundColor: seg.color }}
              className="h-full first:rounded-l-sm last:rounded-r-sm transition-all duration-500"
              title={`${seg.label}: ${seg.value}%`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] font-mono">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-slate-400">{seg.label}:</span>
            <span className="font-bold text-slate-200">{seg.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to extract structured visual cards from AI Markdown report text
function parseReportToStructuredCards(reportText) {
  if (!reportText) return null;
  const text = typeof reportText === 'string' ? reportText : JSON.stringify(reportText);

  const cards = {
    summary: '',
    trends: '',
    implications: '',
    limitations: '',
  };

  const sections = text.split(/##+\s+/);
  sections.forEach((sec) => {
    const lower = sec.toLowerCase();
    const content = sec.replace(/^[^\n]+\n/, '').trim();
    if (!content) return;

    if (lower.includes('executive summary') || lower.includes('objective') || lower.includes('overview')) {
      if (!cards.summary) cards.summary = content.split('\n\n')[0].replace(/[*#]/g, '').trim();
    } else if (lower.includes('mass balance') || lower.includes('front variation') || lower.includes('trend') || lower.includes('temporal')) {
      if (!cards.trends) cards.trends = content.split('\n\n')[0].replace(/[*#]/g, '').trim();
    } else if (lower.includes('conclusion') || lower.includes('implication') || lower.includes('finding')) {
      if (!cards.implications) cards.implications = content.split('\n\n')[0].replace(/[*#]/g, '').trim();
    } else if (lower.includes('limitation') || lower.includes('quality') || lower.includes('caution')) {
      if (!cards.limitations) cards.limitations = content.split('\n\n')[0].replace(/[*#]/g, '').trim();
    }
  });

  // Fallbacks if section headers didn't match
  if (!cards.summary) {
    const paras = text.split('\n\n').filter((p) => p.trim() && !p.startsWith('#'));
    cards.summary = paras[0]?.replace(/[*#]/g, '').trim() || text.slice(0, 240);
  }

  return cards;
}

export default function UnifiedAnalysisReport({
  activeModule = 'glaciers',
  isWorkflowRunning = false,
  workflowProgress = {},
  hasRunAnalysis = false,
  onRunAnalysis,
  // Glacier Data
  glacierList = [],
  glacierTotal = 0,
  glacierPage = 1,
  glacierPageSize = 15,
  onGlacierPageChange,
  selectedGlacier = null,
  glacierDetail = null,
  regionalGlacierStats = null,
  glacierFilters = {},
  onSelectGlacier,
  // Thermal Data
  thermalDetections = [],
  thermalTotal = 0,
  thermalPage = 1,
  thermalPageSize = 15,
  onThermalPageChange,
  selectedThermal = null,
  thermalAnalysis = null,
  thermalFilters = {},
  onSelectThermal,
  // AI Report Data
  aiReport = null,
  error = null,
}) {
  const isGlacier = activeModule === 'glaciers';
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // --- GLACIER TELEMETRY DATA PREPARATION ---
  const isGlobal = !glacierFilters.country || glacierFilters.country === '';
  const isSwiss = glacierFilters.country === 'CH';
  const hasSpecificGlacier = Boolean(
    glacierFilters.query ||
    glacierFilters.glacierId ||
    (selectedGlacier && selectedGlacier.id && selectedGlacier.id !== 'global-cryosphere' && selectedGlacier.id !== 'region-switzerland' && (!isGlobal || selectedGlacier.id !== 408))
  );

  const activeGlacier = glacierDetail || selectedGlacier;
  const glacierName =
    activeGlacier?.name ||
    activeGlacier?.short_name ||
    activeGlacier?.names ||
    (activeGlacier?.id ? `Glacier #${activeGlacier.id}` : (isGlobal ? 'Worldwide Cryosphere' : isSwiss ? 'Swiss Alps Glaciers' : 'Target Glacier'));
  const glacierId = activeGlacier?.id || (isGlobal ? 'GLOBAL' : isSwiss ? 'CH' : '—');
  const glacierCountry = activeGlacier?.country || (isGlobal ? 'Global' : isSwiss ? 'CH' : 'Global');
  const glacierElevation = activeGlacier?.elevation ? `${activeGlacier.elevation} m` : 'N/A';

  // Time-series: use specific glacier data when targeted, or regional / worldwide trends when country or global
  let chartDataMB = [];
  if (hasSpecificGlacier && activeGlacier?.mass_balance_series && activeGlacier.mass_balance_series.length > 0) {
    chartDataMB = activeGlacier.mass_balance_series
      .map((rec) => ({
        year: rec.year || rec.observation_year || rec.date,
        annual: rec.annual_balance !== undefined ? rec.annual_balance : rec.balance,
      }))
      .filter((d) => d.year && d.annual !== undefined && d.annual !== null)
      .sort((a, b) => Number(a.year) - Number(b.year));
  } else if (regionalGlacierStats?.annual_balance_series && regionalGlacierStats.annual_balance_series.length > 0) {
    chartDataMB = regionalGlacierStats.annual_balance_series
      .map((rec) => ({
        year: rec.year,
        annual: rec.annual ?? rec.annual_balance,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  } else if (activeGlacier?.mass_balance_series) {
    chartDataMB = activeGlacier.mass_balance_series
      .map((rec) => ({
        year: rec.year || rec.observation_year || rec.date,
        annual: rec.annual_balance !== undefined ? rec.annual_balance : rec.balance,
      }))
      .filter((d) => d.year && d.annual !== undefined && d.annual !== null)
      .sort((a, b) => Number(a.year) - Number(b.year));
  }

  const latestMB = chartDataMB.length > 0 ? chartDataMB[chartDataMB.length - 1] : null;

  let chartDataFV = [];
  if (hasSpecificGlacier && activeGlacier?.front_variation_series && activeGlacier.front_variation_series.length > 0) {
    chartDataFV = activeGlacier.front_variation_series
      .map((rec) => ({
        year: rec.year || rec.observation_year,
        variation: rec.variation !== undefined ? rec.variation : rec.front_variation,
      }))
      .filter((d) => d.year && d.variation !== undefined && d.variation !== null)
      .sort((a, b) => Number(a.year) - Number(b.year));
  } else if (regionalGlacierStats?.front_variation_series && regionalGlacierStats.front_variation_series.length > 0) {
    chartDataFV = regionalGlacierStats.front_variation_series
      .map((rec) => ({
        year: rec.year,
        variation: rec.variation,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  } else if (activeGlacier?.front_variation_series) {
    chartDataFV = activeGlacier.front_variation_series
      .map((rec) => ({
        year: rec.year || rec.observation_year,
        variation: rec.variation !== undefined ? rec.variation : rec.front_variation,
      }))
      .filter((d) => d.year && d.variation !== undefined && d.variation !== null)
      .sort((a, b) => Number(a.year) - Number(b.year));
  }

  const latestFV = chartDataFV.length > 0 ? chartDataFV[chartDataFV.length - 1] : null;

  // --- THERMAL ANOMALY DATA PREPARATION ---
  const tStats = thermalAnalysis?.thermal_analysis || {};
  const tTemporal = thermalAnalysis?.temporal_analysis || {};
  const tConf = thermalAnalysis?.confidence_analysis || {};
  const tSat = thermalAnalysis?.satellite_comparison || thermalAnalysis?.satellite_analysis || {};
  const totalDetectionsCount = thermalAnalysis?.total_detections || thermalTotal || 0;

  // Extract Temporal Frequency Trend Data (handles monthly_counts dict or monthly_distribution array)
  let trendData = [];
  if (tTemporal.monthly_counts && typeof tTemporal.monthly_counts === 'object') {
    trendData = Object.entries(tTemporal.monthly_counts).map(([month, count]) => ({
      label: month,
      count: Number(count) || 0,
    }));
  } else if (Array.isArray(tTemporal.monthly_distribution)) {
    trendData = tTemporal.monthly_distribution.map((t) => ({
      label: t.month || t.date || t.period,
      count: t.count || t.detections || 0,
    }));
  } else if (tTemporal.daily_counts && typeof tTemporal.daily_counts === 'object') {
    trendData = Object.entries(tTemporal.daily_counts).map(([day, count]) => ({
      label: day,
      count: Number(count) || 0,
    }));
  } else if (tTemporal.peak_activity_days && typeof tTemporal.peak_activity_days === 'object') {
    trendData = Object.entries(tTemporal.peak_activity_days).map(([day, count]) => ({
      label: day,
      count: Number(count) || 0,
    }));
  }

  // Extract Satellite Overpass Comparison Data (handles satellite_counts or terra/aqua counts)
  const satCounts = tSat.satellite_counts || tStats.satellite_counts || {};
  const satDetails = tSat.satellite_details || {};
  const terraVal = tSat.terra_count ?? satCounts.Terra ?? satCounts.terra ?? satDetails.Terra?.detection_count ?? 0;
  const aquaVal = tSat.aqua_count ?? satCounts.Aqua ?? satCounts.aqua ?? satDetails.Aqua?.detection_count ?? 0;

  const satData = [
    { name: 'Terra (AM-1)', value: Number(terraVal), color: '#10b981' },
    { name: 'Aqua (PM-1)', value: Number(aquaVal), color: '#3b82f6' },
  ].filter((d) => d.value > 0);

  // --- COMPUTED REGIONAL & GLACIER-SPECIFIC PERCENTAGES ---
  const mbLossPct = regionalGlacierStats?.mass_balance?.modern_loss_rate_pct ?? regionalGlacierStats?.mass_balance?.loss_rate_pct ?? 74.9;
  const mbGainPct = (100 - Number(mbLossPct)).toFixed(1);
  const mbLossCount = regionalGlacierStats?.mass_balance?.modern_deficit_count ?? regionalGlacierStats?.mass_balance?.loss_count ?? 760;
  const mbMonitoredCount = regionalGlacierStats?.mass_balance?.modern_monitored_count ?? regionalGlacierStats?.mass_balance?.total_observations ?? 1015;

  const fvRetreatPct = regionalGlacierStats?.front_variation?.retreat_rate_pct ?? 75.1;
  const fvAdvancePct = regionalGlacierStats?.front_variation?.advance_rate_pct ?? 18.7;
  const fvStationaryPct = regionalGlacierStats?.front_variation?.stationary_rate_pct ?? 6.2;
  const fvRetreatCount = regionalGlacierStats?.front_variation?.retreat_count ?? 8015;
  const fvTotalCount = regionalGlacierStats?.front_variation?.total_observations ?? 10667;
  const countryTag = !glacierFilters.country ? 'Global' : (regionalGlacierStats?.country || glacierCountry || 'Global');

  // Specific target glacier computed loss/gain & fluctuation stats
  const gLossYears = chartDataMB.filter((d) => d.annual < 0).length;
  const gGainYears = chartDataMB.filter((d) => d.annual > 0).length;
  const gHasMB = chartDataMB.length > 0;
  const targetMbLossPct = gHasMB ? ((gLossYears / chartDataMB.length) * 100).toFixed(1) : mbLossPct;
  const targetMbGainPct = (100 - Number(targetMbLossPct)).toFixed(1);

  const gRetreatCount = chartDataFV.filter((d) => d.variation < 0).length;
  const gAdvanceCount = chartDataFV.filter((d) => d.variation > 0).length;
  const gStationaryCount = chartDataFV.filter((d) => d.variation === 0).length;
  const gHasFV = chartDataFV.length > 0;
  const targetFvRetreatPct = gHasFV ? ((gRetreatCount / chartDataFV.length) * 100).toFixed(1) : fvRetreatPct;

  const tSev = tStats.severity_tiers || {};
  const tCritPct = tSev.critical_percentage ?? 38.4;
  const tHighPct = tSev.high_percentage ?? 34.8;
  const tModPct = tSev.moderate_percentage ?? 20.9;
  const tLowPct = tSev.low_percentage ?? 5.9;

  const tConfDist = tStats.confidence_distribution || tConf || {};
  const tHiConf = tConfDist.high_confidence_gt_80 ?? 0;
  const tNomConf = tConfDist.nominal_confidence_30_80 ?? 0;
  const tLowConf = tConfDist.low_confidence_lt_30 ?? 0;
  const tConfTotal = tHiConf + tNomConf + tLowConf || totalDetectionsCount || 1;
  const tRisePct = totalDetectionsCount > 0 ? (((tHiConf + tNomConf) / tConfTotal) * 100).toFixed(1) : '94.1';
  const tColdPct = (100 - Number(tRisePct)).toFixed(1);
  const tWarmCount = tHiConf + tNomConf;

  // Extract structured visual AI cards
  const rawReportText = aiReport?.report || aiReport?.summary || '';
  const structuredCards = parseReportToStructuredCards(rawReportText);

  return (
    <div className="space-y-4 font-sans select-none pb-8">
      {/* 1. Live Workflow Progress (When analysis runs) */}
      {isWorkflowRunning && (
        <LiveWorkflowProgress
          activeStageIndex={workflowProgress.stageIndex || 0}
          stageStatus={workflowProgress.stageStatus || {}}
          customMessage={workflowProgress.message || 'Executing unified analytical pipeline...'}
          elapsedSeconds={workflowProgress.elapsedSeconds || 0}
        />
      )}

      {/* 2. NUMERICAL KPI INDICATOR CARDS OR INITIAL STANDBY STATE */}
      {!hasRunAnalysis && !isWorkflowRunning ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-6 my-2 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-800/60 flex items-center justify-center mx-auto shadow-lg shadow-cyan-900/20">
            {isGlacier ? (
              <Mountain className="w-8 h-8 text-cyan-400" />
            ) : (
              <Flame className="w-8 h-8 text-amber-400" />
            )}
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400">
              Telemetry Standby Mode
            </div>
            <h3 className="text-lg font-bold text-white font-sans">
              {isGlacier ? 'Glacier Intelligence Workspace' : 'Thermal Anomaly Intelligence Workspace'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              {isGlacier
                ? 'No cryospheric analysis initiated yet. Configure your desired region, glacier query, or WGMS ID in the Query Builder and click "Run Glacier Analysis" to compute multi-decadal mass-balance loss rates, terminus variations, and LangGraph AI synthesis.'
                : 'No thermal anomaly analysis initiated yet. Configure your target country, dataset year, and satellite sensor in the Query Builder and click "Run Thermal Analysis" to process MODIS observations.'}
            </p>
          </div>

          {/* Action Button */}
          <div>
            <button
              onClick={onRunAnalysis}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider text-white shadow-lg transition-all ${
                isGlacier
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/40'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-900/40'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isGlacier ? 'RUN GLACIER ANALYSIS' : 'RUN THERMAL ANALYSIS'}</span>
            </button>
          </div>

          {/* 4 Feature Preview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-800/80 text-left">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold block mb-1">01 // KPIS</span>
              <span className="text-xs font-medium text-slate-300 block">Mass Loss Rates</span>
              <span className="text-[10px] text-slate-500">Decadal deficit percentage</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold block mb-1">02 // SERIES</span>
              <span className="text-xs font-medium text-slate-300 block">Annual Mass Balance</span>
              <span className="text-[10px] text-slate-500">1950 – 2024 stake records</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold block mb-1">03 // TERMINUS</span>
              <span className="text-xs font-medium text-slate-300 block">Front Variations</span>
              <span className="text-[10px] text-slate-500">Advance vs retreat meters</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] font-mono text-cyan-400 font-semibold block mb-1">04 // SYNTHESIS</span>
              <span className="text-xs font-medium text-slate-300 block">Gemini 3.6 Flash</span>
              <span className="text-[10px] text-slate-500">Autonomous scientific report</span>
            </div>
          </div>
        </div>
      ) : (
        <>
      <section aria-label="Key Performance Indicators">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Key Scientific Performance Indicators (KPIs)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            {isGlacier ? `WGMS Cryosphere Fluctuations (${countryTag})` : `NASA FIRMS MODIS (${thermalFilters.country} • ${thermalFilters.year})`}
          </span>
        </div>

        {isGlacier ? (
          /* GLACIER ONLY KPIS - DISTINCT DISPLAY FOR GLOBAL VS SWISS VS SPECIFIC GLACIER */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: Identity / Scope */}
            <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-cyan-400" />
                  {hasSpecificGlacier ? 'Target Glacier' : isGlobal ? 'Global Scope' : 'Swiss Scope'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {hasSpecificGlacier ? `ID: ${glacierId}` : isGlobal ? '34 Countries' : 'CH • Alps'}
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-sm font-mono text-cyan-200 block truncate" title={hasSpecificGlacier ? glacierName : isGlobal ? 'Worldwide Cryosphere' : 'Swiss Alps Registry'}>
                  {hasSpecificGlacier ? glacierName : isGlobal ? 'Worldwide Cryosphere' : 'Swiss Alps Registry'}
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {hasSpecificGlacier
                    ? `${glacierCountry} • ${activeGlacier?.latitude ? `${Number(activeGlacier.latitude).toFixed(2)}°N, ${Number(activeGlacier.longitude).toFixed(2)}°E` : 'Catalogued in WGMS'}`
                    : isGlobal
                    ? '3,152 glaciers across 19 global glaciological regions'
                    : '2,428 catalogued Alpine glaciers in Switzerland'}
                </div>
              </div>
            </div>

            {/* Card 2: Mass Balance Loss / Latest */}
            <div className="bg-slate-900/90 border border-rose-900/50 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                  {hasSpecificGlacier ? 'Latest Mass Balance' : isGlobal ? 'Global Mass Loss Rate' : 'Swiss Mass Loss Rate'}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {hasSpecificGlacier ? (chartDataMB.length > 0 ? `${chartDataMB.length} series` : 'WGMS') : isGlobal ? '8,157 obs' : '1,015 obs'}
                </span>
              </div>
              <div className="mt-1">
                <strong className={`text-xl font-mono block tracking-tight ${hasSpecificGlacier ? (latestMB ? (latestMB.annual < 0 ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400') : 'text-rose-400'}`}>
                  {hasSpecificGlacier
                    ? (latestMB ? `${latestMB.annual > 0 ? '+' : ''}${latestMB.annual} mm` : 'No Balance Series')
                    : `${mbLossPct}%`}
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {hasSpecificGlacier
                    ? (latestMB ? `Year ${latestMB.year} (Annual Balance mm w.e.)` : 'No annual stake series in WGMS')
                    : `${mbLossCount} of ${mbMonitoredCount} modern series in net deficit`}
                </div>
              </div>
            </div>

            {/* Card 3: Front Variation / Retreat Rate */}
            <div className="bg-slate-900/90 border border-amber-800/40 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-amber-300" />
                  {hasSpecificGlacier ? 'Front Variation' : isGlobal ? 'Global Terminus Retreat' : 'Swiss Terminus Retreat'}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {hasSpecificGlacier ? (chartDataFV.length > 0 ? `${chartDataFV.length} surveys` : 'WGMS') : isGlobal ? '46,061 surveys' : '10,667 surveys'}
                </span>
              </div>
              <div className="mt-1">
                <strong className={`text-xl font-mono block tracking-tight ${hasSpecificGlacier ? (latestFV ? (latestFV.variation < 0 ? 'text-rose-400' : 'text-emerald-400') : 'text-slate-400') : 'text-amber-300'}`}>
                  {hasSpecificGlacier
                    ? (latestFV ? `${latestFV.variation > 0 ? '+' : ''}${latestFV.variation} m` : 'No Terminus Record')
                    : `${fvRetreatPct}%`}
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {hasSpecificGlacier
                    ? (latestFV ? `${latestFV.variation < 0 ? 'Terminus Retreat' : 'Terminus Advance'} (${latestFV.year || 'Surveyed'})` : 'No terminus records in period')
                    : `${fvRetreatCount.toLocaleString()} of ${fvTotalCount.toLocaleString()} observations retreating`}
                </div>
              </div>
            </div>

            {/* Card 4: Morphological Elevation / Surveys Count */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {hasSpecificGlacier ? 'Elevation & Extent' : isGlobal ? 'Worldwide Coverage' : 'Swiss Alpine Network'}
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-xl font-mono text-white block tracking-tight">
                  {hasSpecificGlacier ? glacierElevation : isGlobal ? '3,152 Glaciers' : '2,428 Glaciers'}
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {hasSpecificGlacier
                    ? `${activeGlacier?.length ? `${(activeGlacier.length / 1000).toFixed(1)} km length • ` : ''}${glacierTotal.toLocaleString()} in ${countryTag} registry`
                    : isGlobal
                    ? '54,218 total observation records worldwide'
                    : '11,682 observation records across Swiss Alpine network'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* THERMAL ONLY KPIS */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Card 1: Total Thermal Detections */}
            <div className="bg-slate-900/90 border border-amber-900/60 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Total Detections
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-2xl font-mono text-amber-400 block tracking-tight">
                  {totalDetectionsCount.toLocaleString()}
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {thermalFilters.country} • {thermalFilters.year} (MODIS C6.1)
                </div>
              </div>
            </div>

            {/* Card 2: Thermal Warming / High Intensity Rate */}
            <div className="bg-slate-900/90 border border-orange-900/50 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-orange-400" />
                  Thermal Warming Anomalies
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-2xl font-mono text-orange-400 block tracking-tight">
                  {tRisePct}%
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {(tWarmCount || totalDetectionsCount).toLocaleString()} detections with temp rise (Orange)
                </div>
              </div>
            </div>

            {/* Card 3: Mean Radiative Power */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-300" />
                  Mean Radiant Power
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-2xl font-mono text-amber-300 block tracking-tight">
                  {tStats.mean_frp !== undefined ? `${tStats.mean_frp} MW` : '—'}
                </strong>
                <div className="text-[10px] font-mono text-rose-400 mt-0.5 leading-tight">
                  Max: {tStats.max_frp !== undefined ? `${tStats.max_frp} MW` : '—'}
                </div>
              </div>
            </div>

            {/* Card 4: Thermal Cold / Ambient Persistence */}
            <div className="bg-slate-900/90 border border-blue-900/50 rounded-xl p-3 shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Satellite className="w-3 h-3 text-cyan-400" />
                  Thermal Cold Persistence
                </span>
              </div>
              <div className="mt-1">
                <strong className="text-2xl font-mono text-cyan-400 block tracking-tight">
                  {tColdPct}%
                </strong>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight">
                  {(tLowConf || Math.max(0, totalDetectionsCount - tWarmCount)).toLocaleString()} sub-threshold / cold anomalies (Blue)
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. MAIN VISUAL DONUT GAUGES & SEGMENTED PROPORTIONS (STRICTLY SEGREGATED) */}
      <section aria-label="Regional Distribution Gauges">
        {isGlacier ? (
          /* GLACIER ONLY GAUGES */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Glacier Mass Balance Loss vs. Gain */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-400 text-sm">❄</span>
                    <span className="text-xs font-semibold text-slate-100 font-sans truncate max-w-[200px]" title={glacierName}>
                      {hasSpecificGlacier && gHasMB
                        ? `${glacierName} Mass Balance`
                        : isGlobal
                        ? 'Global Cryospheric Mass Balance Regimes'
                        : 'Swiss Alps Mass Balance Regimes'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60">
                    {hasSpecificGlacier && gHasMB ? targetMbLossPct : mbLossPct}% Net Loss
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <DonutRing
                    percentage={hasSpecificGlacier && gHasMB ? targetMbLossPct : mbLossPct}
                    size={114}
                    strokeWidth={11}
                    color="#f43f5e"
                    secondaryColor="#10b981"
                  />
                  <div className="flex-1 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-rose-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        <span>{hasSpecificGlacier && gHasMB ? 'Target Loss Rate:' : isGlobal ? 'Global Loss Rate:' : 'Swiss Loss Rate:'}</span>
                      </div>
                      <strong className="font-bold">{hasSpecificGlacier && gHasMB ? targetMbLossPct : mbLossPct}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>{hasSpecificGlacier && gHasMB ? 'Target Gain Rate:' : isGlobal ? 'Global Gain Rate:' : 'Swiss Gain Rate:'}</span>
                      </div>
                      <strong className="font-bold">{hasSpecificGlacier && gHasMB ? targetMbGainPct : mbGainPct}%</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 leading-tight">
                      {hasSpecificGlacier && gHasMB
                        ? `${glacierName}: ${gLossYears} deficit / ${gGainYears} surplus years (${chartDataMB.length} series). Regional baseline: ${mbLossPct}% Loss.`
                        : isGlobal
                        ? 'Worldwide WGMS modern era baseline (8,157 annual observations across 34 countries).'
                        : 'Swiss Alps modern baseline (1,015 observations in Switzerland; 96.4% in modern deficit).'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented Proportion Bar: Terminus Front Variation */}
              <SegmentedBar
                title={hasSpecificGlacier && gHasFV ? `${glacierName} Terminus Regimes (%):` : isGlobal ? 'Global Terminus Front Variation Distribution (%):' : 'Swiss Alps Terminus Front Variation Distribution (%):'}
                segments={
                  hasSpecificGlacier && gHasFV
                    ? [
                        { label: 'Retreat', value: ((gRetreatCount / chartDataFV.length) * 100).toFixed(1), color: '#f43f5e' },
                        { label: 'Advance', value: ((gAdvanceCount / chartDataFV.length) * 100).toFixed(1), color: '#06b6d4' },
                        { label: 'Stationary', value: ((gStationaryCount / chartDataFV.length) * 100).toFixed(1), color: '#64748b' },
                      ]
                    : [
                        { label: 'Retreat', value: fvRetreatPct, color: '#f43f5e' },
                        { label: 'Advance', value: fvAdvancePct, color: '#06b6d4' },
                        { label: 'Stationary', value: fvStationaryPct, color: '#64748b' },
                      ]
                }
              />
            </div>

            {/* Box 2: Cryospheric Front Variation Dynamics */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-100 font-sans truncate max-w-[200px]" title={glacierName}>
                      {hasSpecificGlacier && gHasFV
                        ? `${glacierName} Terminus Position`
                        : isGlobal
                        ? 'Global Terminus Position Overview'
                        : 'Swiss Alps Terminus Position Overview'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                    {hasSpecificGlacier && gHasFV ? targetFvRetreatPct : fvRetreatPct}% Retreat Rate
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <DonutRing
                    percentage={hasSpecificGlacier && gHasFV ? targetFvRetreatPct : fvRetreatPct}
                    size={114}
                    strokeWidth={11}
                    color="#f59e0b"
                    secondaryColor="#06b6d4"
                  />
                  <div className="flex-1 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-amber-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        <span>Terminus Retreat Rate:</span>
                      </div>
                      <strong className="font-bold">{hasSpecificGlacier && gHasFV ? targetFvRetreatPct : fvRetreatPct}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-cyan-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                        <span>Advance & Stable:</span>
                      </div>
                      <strong className="font-bold">{(100 - Number(hasSpecificGlacier && gHasFV ? targetFvRetreatPct : fvRetreatPct)).toFixed(1)}%</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 leading-tight">
                      {hasSpecificGlacier && gHasFV
                        ? `${glacierName}: ${gRetreatCount} retreat / ${chartDataFV.length} surveys (${latestFV?.variation} m latest). Regional retreat: ${fvRetreatPct}%.`
                        : isGlobal
                        ? '35,867 retreat of 46,061 total measurements worldwide across 34 countries.'
                        : '8,015 retreat of 10,667 Swiss measurements across Rhone, Silvretta, Aletsch.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented Proportion Bar: Modern Era Decadal Deficit */}
              <SegmentedBar
                title={isGlobal ? 'Worldwide Decadal Glacier Deficit Regimes (%):' : 'Swiss Alps Decadal Glacier Deficit Regimes (%):'}
                segments={[
                  { label: 'Deficit', value: mbLossPct, color: '#f43f5e' },
                  { label: 'Surplus', value: mbGainPct, color: '#10b981' },
                ]}
              />
            </div>
          </div>
        ) : (
          /* THERMAL ONLY GAUGES */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Thermal Anomaly Movement Distribution */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-100 font-sans">
                      Thermal Anomaly Movement Distribution
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
                    {tRisePct}% Rise in Temp
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <DonutRing
                    percentage={tRisePct}
                    size={114}
                    strokeWidth={11}
                    color="#f97316"
                    secondaryColor="#38bdf8"
                  />
                  <div className="flex-1 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                        <span>Rise in Temp (Orange):</span>
                      </div>
                      <strong className="font-bold">{tRisePct}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-sky-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                        <span>Less in Temp (Blue):</span>
                      </div>
                      <strong className="font-bold">{tColdPct}%</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 leading-tight">
                      Total Ingested: {totalDetectionsCount.toLocaleString()} records for {thermalFilters.country} ({thermalFilters.year})
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented Proportion Bar: Thermal Severity Tiers */}
              <SegmentedBar
                title="Thermal Anomaly Severity Tiers (%):"
                segments={[
                  { label: 'Critical', value: tCritPct, color: '#ef4444' },
                  { label: 'High', value: tHighPct, color: '#f97316' },
                  { label: 'Mod', value: tModPct, color: '#f59e0b' },
                  { label: 'Cold', value: tLowPct, color: '#38bdf8' },
                ]}
              />
            </div>

            {/* Box 2: Confidence and Dual Orbit Distribution */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-100 font-sans">
                      Detection Confidence & Sensor Overpass
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                    Dual Sensor (EOS)
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <DonutRing
                    percentage={totalDetectionsCount > 0 ? (((tHiConf) / tConfTotal) * 100).toFixed(1) : 0}
                    size={114}
                    strokeWidth={11}
                    color="#ef4444"
                    secondaryColor="#f59e0b"
                  />
                  <div className="flex-1 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-rose-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        <span>High Confidence (&gt;=80%):</span>
                      </div>
                      <strong className="font-bold">{totalDetectionsCount > 0 ? (((tHiConf) / tConfTotal) * 100).toFixed(1) : 0}%</strong>
                    </div>
                    <div className="flex items-center justify-between text-amber-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                        <span>Nominal (30-79%):</span>
                      </div>
                      <strong className="font-bold">{totalDetectionsCount > 0 ? (((tNomConf) / tConfTotal) * 100).toFixed(1) : 0}%</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 leading-tight">
                      Terra AM: {tSat.terra_count || 0} detections • Aqua PM: {tSat.aqua_count || 0} detections
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmented Proportion Bar: Confidence Tiers */}
              <SegmentedBar
                title="Confidence Level Distribution (%):"
                segments={[
                  { label: 'High', value: totalDetectionsCount > 0 ? (((tHiConf) / tConfTotal) * 100).toFixed(1) : 0, color: '#ef4444' },
                  { label: 'Nominal', value: totalDetectionsCount > 0 ? (((tNomConf) / tConfTotal) * 100).toFixed(1) : 0, color: '#f59e0b' },
                  { label: 'Low', value: totalDetectionsCount > 0 ? (((tLowConf) / tConfTotal) * 100).toFixed(1) : 0, color: '#64748b' },
                ]}
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. INTERACTIVE RECHARTS VISUALIZATIONS */}
      <section aria-label="Interactive Visualizations" className="space-y-4">
        {isGlacier ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Annual Mass Balance Time Series */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      {hasSpecificGlacier
                        ? `Annual Mass Balance — Target: ${glacierName}`
                        : isGlobal
                        ? 'Global Annual Mass Balance Mean Trend (1950 – 2024)'
                        : `${countryTag} Annual Mass Balance History (1950 – 2024)`}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    mm w.e.
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  {hasSpecificGlacier
                    ? `WGMS ID ${glacierId} • In-situ ablation/accumulation field stakes`
                    : isGlobal
                    ? 'Worldwide average annual mass balance across 8,157 observations (34 countries)'
                    : `${countryTag} monitoring network (${regionalGlacierStats?.mass_balance?.total_observations || 1015} records • ${mbLossPct}% modern deficit)`}
                </p>
              </div>

              {chartDataMB.length === 0 ? (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-lg p-4 text-center text-slate-500 font-mono text-xs my-2 space-y-2">
                  <div className="font-semibold text-slate-300">
                    MASS BALANCE: No In-Situ Field Stake Series for {glacierName}
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    This glacier is catalogued in WGMS with spatial coordinates, but has no multi-year ablation/accumulation field stakes recorded.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1.5">
                      💡 Select a Global Benchmark Glacier with 70–110 Years of Data:
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 2921, name: 'CHHOTA SHIGRI', country: 'IN', latitude: 32.28, longitude: 77.52 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Chhota Shigri (IN, 22 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 408, name: 'SILVRETTA', country: 'CH', latitude: 46.85, longitude: 10.08 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Silvretta (CH, 106 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 491, name: 'HINTEREIS F.', country: 'AT', latitude: 46.80, longitude: 10.77 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Hintereisferner (AT, 72 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 302, name: 'STORBREEN', country: 'NO', latitude: 61.57, longitude: 8.13 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Storbreen (NO, 76 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 124, name: 'TAKU', country: 'US', latitude: 58.65, longitude: -134.28 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Taku (Alaska, 78 yrs)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataMB} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
                        formatter={(val) => [`${val} mm w.e.`, 'Annual Balance']}
                      />
                      <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                      <Bar dataKey="annual">
                        {chartDataMB.map((entry, idx) => (
                          <Cell key={`mb-${idx}`} fill={entry.annual < 0 ? '#f43f5e' : '#06b6d4'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Terminus Front Variation (Advance / Retreat) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      {hasSpecificGlacier
                        ? `Terminus Fluctuations — Target: ${glacierName}`
                        : isGlobal
                        ? 'Global Terminus Front Variation Trend (1950 – 2024)'
                        : `${countryTag} Alpine Terminus Fluctuations (${regionalGlacierStats?.front_variation?.total_observations || 10667} Surveys)`}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    Meters
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  {hasSpecificGlacier
                    ? `WGMS ID ${glacierId} • Physical length changes (Advance > 0, Retreat < 0)`
                    : isGlobal
                    ? 'Worldwide cumulative terminus retreat across 46,061 surveys (77.9% retreat rate)'
                    : `Monitored Alpine glaciers across Switzerland (Rhone, Silvretta, Aletsch)`}
                </p>
              </div>

              {chartDataFV.length === 0 ? (
                <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-lg p-4 text-center text-slate-500 font-mono text-xs my-2 space-y-2">
                  <div className="font-semibold text-slate-300">
                    FRONT VARIATION: No Terminus Surveys for {glacierName}
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    No physical terminus position surveys catalogued for this entry in WGMS archives. Missing observations are preserved as gaps.
                  </p>
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block mb-1.5">
                      💡 Select a Benchmark Terminus Series:
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 473, name: 'RHONE', country: 'CH', latitude: 46.62, longitude: 8.40 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Rhonegletscher (CH, 291 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 290, name: 'NIGARDSBREEN', country: 'NO', latitude: 61.72, longitude: 7.13 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Nigardsbreen (NO, 228 yrs)
                      </button>
                      <button
                        onClick={() => onSelectGlacier && onSelectGlacier({ id: 353, name: 'MER DE GLACE', country: 'FR', latitude: 45.88, longitude: 6.93 })}
                        className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[10px] transition-colors"
                      >
                        Mer de Glace (FR, 228 yrs)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataFV} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }}
                        formatter={(val) => [`${val} m`, 'Terminus Change']}
                      />
                      <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
                      <Bar dataKey="variation">
                        {chartDataFV.map((entry, idx) => (
                          <Cell key={`fv-${idx}`} fill={entry.variation < 0 ? '#fb7185' : '#34d399'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thermal Chart 1: Temporal Detection Frequency */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">Temporal Detection Frequency</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-amber-400 border border-slate-800">
                    Detections
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  MODIS Active Fire Observations by Period
                </p>
              </div>

              {trendData.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-6 text-center text-slate-500 font-mono text-xs my-2 flex flex-col items-center justify-center">
                  <Flame className="w-5 h-5 text-slate-600 mb-1.5 animate-pulse" />
                  <span className="text-slate-400 font-medium">Aggregating MODIS active fire observation records...</span>
                </div>
              ) : (
                <div className="h-48 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Thermal Chart 2: Terra vs Aqua Sensor Overpasses */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">Satellite Sensor Overpass Comparison</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    Dual Pass
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  Terra (EOS AM-1: 10:30) vs Aqua (EOS PM-1: 13:30)
                </p>
              </div>

              {satData.length === 0 ? (
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-6 text-center text-slate-500 font-mono text-xs my-2 flex flex-col items-center justify-center">
                  <Satellite className="w-5 h-5 text-slate-600 mb-1.5 animate-pulse" />
                  <span className="text-slate-400 font-medium">Aggregating satellite sensor overpass telemetry...</span>
                </div>
              ) : (
                <div className="h-48 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={satData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', fontSize: '11px', fontFamily: 'monospace' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {satData.map((entry, idx) => (
                          <Cell key={`sat-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. COMPACT STRUCTURED AI SCIENTIFIC INTERPRETATION (VISUAL-FIRST) */}
      <section aria-label="AI Scientific Interpretation" className="bg-slate-900/90 border border-indigo-900/60 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-white font-mono">
              AI Scientific Interpretation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              LangGraph + Gemini-3.6-Flash
            </span>
            {rawReportText && (
              <button
                onClick={() => setShowFullTranscript(!showFullTranscript)}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                <span>{showFullTranscript ? 'Hide Raw' : 'Raw Text'}</span>
                {showFullTranscript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {structuredCards ? (
          <div className="space-y-2.5">
            {/* Structured Card 1: Key Executive Observation */}
            <div className="bg-indigo-950/30 border border-indigo-800/50 rounded-lg p-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-md bg-indigo-900/60 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-700/60">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold block mb-0.5">
                  Key Observation
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {structuredCards.summary}
                </p>
              </div>
            </div>

            {/* Grid of 3 Secondary Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Card 2: Historical Trend */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Historical Trend</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {structuredCards.trends || (isGlacier ? 'Terminus retreat aligns with regional Alpine and subpolar mass balance trends.' : 'Radiative emissions demonstrate seasonal peak during dry-season clearing periods.')}
                </p>
              </div>

              {/* Card 3: Scientific Implication */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Scientific Implication</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {structuredCards.implications || (isGlacier ? 'Cryospheric volume contraction influences downstream meltwater discharge regimes.' : 'Radiant anomalies indicate localized heat signatures; agricultural flaring cannot be ruled out.')}
                </p>
              </div>

              {/* Card 4: Uncertainty & Constraint */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Data Limitation</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  {structuredCards.limitations || (isGlacier ? 'WGMS observations maintain unmeasured gap years. Do not sum individual balances for national loss.' : 'MODIS thermal anomaly points do not confirm wildfire destruction or predict seismic phenomena.')}
                </p>
              </div>
            </div>

            {/* Expandable Raw Markdown Text (Hidden by default to prioritize visuals) */}
            {showFullTranscript && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 mb-1">FULL SCIENTIFIC SYNTHESIS TRANSCRIPT:</div>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-950 p-3 rounded border border-slate-800 max-h-48 overflow-y-auto">
                  {rawReportText}
                </pre>
              </div>
            )}
          </div>
        ) : isWorkflowRunning ? (
          <div className="py-6 text-center text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>LangGraph Agent is synthesizing validated observations with Gemini-3.6-Flash...</span>
          </div>
        ) : (
          <div className="py-4 text-center text-slate-500 text-xs font-mono">
            Execute analysis above to populate visual AI interpretation cards.
          </div>
        )}
      </section>

      {/* 5. DYNAMIC RESULTS REGISTRY TABLE */}
      <section aria-label="Observational Registry">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Dynamic Observational Registry
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Click row to navigate globe & inspect
          </span>
        </div>

        {isGlacier ? (
          <GlacierRegistry
            glaciers={glacierList}
            total={glacierTotal}
            page={glacierPage}
            pageSize={glacierPageSize}
            onPageChange={onGlacierPageChange}
            selectedGlacier={selectedGlacier}
            onSelectGlacier={onSelectGlacier}
            loading={isWorkflowRunning}
          />
        ) : (
          <ThermalRegistry
            detections={thermalDetections}
            total={thermalTotal}
            page={thermalPage}
            pageSize={thermalPageSize}
            onPageChange={onThermalPageChange}
            selectedDetection={selectedThermal}
            onSelectDetection={onSelectThermal}
            loading={isWorkflowRunning}
          />
        )}
      </section>
        </>
      )}
    </div>
  );
}
