import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export function useEarthpulseData() {
  const [activeView, setActiveView] = useState('split'); // 'split' | 'ai'
  const [activeModule, setActiveModule] = useState('glaciers'); // 'glaciers' | 'thermal' | 'all'
  const [backendConnected, setBackendConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Available MODIS countries from backend
  const [availableCountries, setAvailableCountries] = useState([]);

  // --- UNIFIED WORKFLOW PROGRESS STATE ---
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [workflowProgress, setWorkflowProgress] = useState({
    stageIndex: 0,
    stageStatus: {},
    message: '',
    elapsedSeconds: 0,
  });
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // --- GLACIER STATE ---
  const [glacierFilters, setGlacierFilters] = useState({
    country: 'CH',
    query: '',
    glacierId: '',
    startDate: '1950-01-01',
    endDate: '2025-12-31',
    analysisType: 'all',
  });
  const [glacierPage, setGlacierPage] = useState(1);
  const [glacierPageSize] = useState(15);
  const [glacierList, setGlacierList] = useState([]);
  const [glacierTotal, setGlacierTotal] = useState(0);
  const [glacierGeoJSON, setGlacierGeoJSON] = useState(null);
  const [selectedGlacier, setSelectedGlacier] = useState(null);
  const [glacierDetail, setGlacierDetail] = useState(null);
  const [loadingGlacierDetail, setLoadingGlacierDetail] = useState(false);
  const [regionalGlacierStats, setRegionalGlacierStats] = useState(null);
  const [hasRunGlacierAnalysis, setHasRunGlacierAnalysis] = useState(false);

  // --- THERMAL ANOMALY STATE ---
  const [thermalFilters, setThermalFilters] = useState({
    country: 'Singapore',
    year: 2025,
    startDate: '',
    endDate: '',
    satellite: '',
    daynight: '',
    minConfidence: 0,
    minFRP: '',
    includeClustering: false,
    epsKm: 15,
    minSamples: 3,
  });
  const [thermalPage, setThermalPage] = useState(1);
  const [thermalPageSize] = useState(15);
  const [thermalDetections, setThermalDetections] = useState([]);
  const [thermalTotal, setThermalTotal] = useState(0);
  const [thermalGeoJSON, setThermalGeoJSON] = useState(null);
  const [selectedThermal, setSelectedThermal] = useState(null);
  const [thermalAnalysis, setThermalAnalysis] = useState(null);
  const [hasRunThermalAnalysis, setHasRunThermalAnalysis] = useState(false);

  // --- AI REPORT STATE ---
  const [aiReport, setAiReport] = useState(null);

  // --- UNIFIED SELECTION FOR CESIUM GLOBE ---
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Check Backend Health & Fetch Countries on Mount
  useEffect(() => {
    let isMounted = true;
    api
      .getHealth()
      .then((res) => {
        if (isMounted) setBackendConnected(res.status === 'online');
      })
      .catch(() => {
        if (isMounted) setBackendConnected(false);
      });

    api
      .getModisCountries()
      .then((res) => {
        if (isMounted && res.countries) setAvailableCountries(res.countries);
      })
      .catch((err) => console.warn('Could not load MODIS country catalog:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  // Timer helper for live workflow progress
  const startWorkflowTimer = () => {
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setWorkflowProgress((prev) => ({
        ...prev,
        elapsedSeconds: (Date.now() - startTimeRef.current) / 1000,
      }));
    }, 100);
  };

  const stopWorkflowTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // --- 1. UNIFIED GLACIER ANALYSIS PIPELINE ---
  const runGlacierAnalysisUnified = useCallback(
    async (overrideFilters, targetPage = 1, targetGlacierId = null) => {
      setHasRunGlacierAnalysis(true);
      setIsWorkflowRunning(true);
      setError(null);
      startWorkflowTimer();

      const f = overrideFilters || glacierFilters;
      const offset = (targetPage - 1) * glacierPageSize;

      try {
        // Stage 0: Retrieval
        setWorkflowProgress({
          stageIndex: 0,
          stageStatus: { retrieval: 'running' },
          message: `Retrieving glacier records for country='${f.country || 'Global'}'...`,
          elapsedSeconds: 0,
        });

        const [geojson, listRes, regionalStats] = await Promise.all([
          api.getGlaciersGeoJSON({ country: f.country || undefined, limit: 400 }),
          api.getGlacierList({
            country: f.country || undefined,
            query: f.query || undefined,
            limit: glacierPageSize,
            offset: offset,
          }),
          api.getRegionalGlacierStats(f.country || undefined).catch((err) => {
            console.warn('Could not fetch regional glacier stats:', err);
            return null;
          }),
        ]);

        setGlacierGeoJSON(geojson);
        setGlacierList(listRes.items || []);
        setGlacierTotal(listRes.total || 0);
        if (regionalStats) {
          setRegionalGlacierStats(regionalStats);
        }

        // Stage 1: Validation
        setWorkflowProgress((prev) => ({
          stageIndex: 1,
          stageStatus: { ...prev.stageStatus, retrieval: 'completed', validation: 'running' },
          message: `Validating ${listRes.items?.length || 0} matching WGMS records and coordinates...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        await new Promise((r) => setTimeout(r, 200));

        // Auto-select target glacier (prioritizes: explicit ID -> user search query -> glacierId -> regional benchmark)
        let targetGlacier = null;
        if (targetGlacierId) {
          targetGlacier = listRes.items?.find((g) => g.id === targetGlacierId) || { id: targetGlacierId, country: f.country };
        } else if (f.glacierId && String(f.glacierId).trim()) {
          const reqId = Number(f.glacierId);
          targetGlacier = listRes.items?.find((g) => g.id === reqId) || { id: reqId, country: f.country };
        } else if (f.query && f.query.trim()) {
          const qNorm = f.query.trim().toLowerCase();
          const match = listRes.items?.find(
            (g) =>
              (g.short_name && g.short_name.toLowerCase().includes(qNorm)) ||
              (g.names && g.names.toLowerCase().includes(qNorm)) ||
              (g.name && g.name.toLowerCase().includes(qNorm)) ||
              String(g.id) === qNorm
          );
          targetGlacier = match || (listRes.items && listRes.items.length > 0 ? listRes.items[0] : null);

          // If still not resolved from current list, perform global lookup
          if (!targetGlacier) {
            try {
              const globalRes = await api.getGlacierList({ query: f.query.trim(), limit: 10 });
              if (globalRes.items && globalRes.items.length > 0) {
                targetGlacier = globalRes.items[0];
                setGlacierList(globalRes.items);
                setGlacierTotal(globalRes.total);
              }
            } catch (_) {}
          }
        } else if (regionalStats?.benchmark_glaciers && regionalStats.benchmark_glaciers.length > 0) {
          const bg = regionalStats.benchmark_glaciers[0];
          targetGlacier = listRes.items?.find((g) => g.id === bg.id) || {
            id: bg.id,
            name: bg.name,
            short_name: bg.name,
            country: bg.country,
            latitude: bg.latitude,
            longitude: bg.longitude,
          };
        } else if (listRes.items && listRes.items.length > 0) {
          const benchmark = listRes.items.find((g) => g.id === 408 || g.id === 1383 || g.id === 2660 || g.id === 491);
          targetGlacier = benchmark || listRes.items[0];
        }

        if (targetGlacier) {
          // Only synchronize country if the user specifically queried a name or ID belonging to another country.
          // NEVER override when the user deliberately selected 'All Countries' (empty country string).
          if (f.country && targetGlacier.country && targetGlacier.country !== f.country && (f.query || f.glacierId)) {
            setGlacierFilters((prev) => ({ ...prev, country: targetGlacier.country }));
            api.getRegionalGlacierStats(targetGlacier.country)
              .then((st) => {
                if (st) setRegionalGlacierStats(st);
              })
              .catch(() => {});
          }

          setSelectedGlacier(targetGlacier);
          if (targetGlacier.latitude && targetGlacier.longitude) {
            setSelectedFeature({
              id: `glacier-${targetGlacier.id}`,
              name: targetGlacier.short_name || targetGlacier.name || targetGlacier.names || `Glacier #${targetGlacier.id}`,
              country: targetGlacier.country,
              coordinates: [Number(targetGlacier.longitude), Number(targetGlacier.latitude)],
              elevation: targetGlacier.elevation,
              module: 'glacier',
            });
          }
        }

        // Stage 2: Numerical Calculations
        setWorkflowProgress((prev) => ({
          stageIndex: 2,
          stageStatus: { ...prev.stageStatus, validation: 'completed', numerical: 'running' },
          message: `Computing annual mass-balance trends and terminus front variations...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        const isGlobalScope = !f.country || f.country === '';
        const isSpecificGlacier = Boolean(f.query || f.glacierId || targetGlacierId);

        let detail = targetGlacier;
        if (isSpecificGlacier && targetGlacier && targetGlacier.id) {
          try {
            detail = await api.getGlacierDetail(targetGlacier.id);
            setGlacierDetail(detail);
            setSelectedGlacier(detail);
            if (detail?.latitude && detail?.longitude) {
              setSelectedFeature({
                id: `glacier-${detail.id}`,
                name: detail.short_name || detail.name || detail.names || `Glacier #${detail.id}`,
                country: detail.country,
                coordinates: [Number(detail.longitude), Number(detail.latitude)],
                elevation: detail.elevation,
                module: 'glacier',
              });
            }
          } catch (_) {
            detail = targetGlacier;
          }
        } else if (isGlobalScope && !isSpecificGlacier) {
          // Global view on Cesium
          setGlacierDetail(null);
          setSelectedGlacier(null);
          setSelectedFeature({
            id: 'global-cryosphere',
            name: 'GLOBAL CRYOSPHERE (ALL COUNTRIES)',
            country: 'GLOBAL',
            coordinates: [10.0, 25.0],
            height: 18000000,
            module: 'glacier',
          });
        } else if (f.country === 'CH' && !isSpecificGlacier) {
          // Swiss Alps view
          if (targetGlacier && targetGlacier.id) {
            try {
              detail = await api.getGlacierDetail(targetGlacier.id);
              setGlacierDetail(detail);
              setSelectedGlacier(detail);
            } catch (_) {}
          }
          setSelectedFeature({
            id: 'region-switzerland',
            name: 'SWITZERLAND (SWISS ALPS)',
            country: 'CH',
            coordinates: [8.2275, 46.8182],
            height: 280000,
            module: 'glacier',
          });
        }

        // Stage 3 & 4: Historical Trends & Analytical Charts
        setWorkflowProgress((prev) => ({
          stageIndex: 3,
          stageStatus: { ...prev.stageStatus, numerical: 'completed', trends: 'completed', charts: 'running' },
          message: `Synthesizing Recharts time-series distributions...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        await new Promise((r) => setTimeout(r, 200));

        // Stage 5 & 6: LangGraph AI Dispatch & Gemini Finalization
        setWorkflowProgress((prev) => ({
          stageIndex: 5,
          stageStatus: { ...prev.stageStatus, charts: 'completed', ai_dispatch: 'running', finalizing: 'pending' },
          message: `Dispatching validated telemetry to LangGraph & Gemini-3.6-Flash...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        let queryDesc = '';
        let agentCountry = f.country || undefined;
        let agentGlacierId = undefined;
        let agentGlacierName = undefined;

        if (isSpecificGlacier) {
          agentGlacierName = detail?.short_name || detail?.name || targetGlacier?.short_name || targetGlacier?.name || f.query;
          agentGlacierId = detail?.id || targetGlacier?.id;
          agentCountry = detail?.country || targetGlacier?.country || f.country || undefined;
          queryDesc = `Analyze cryospheric mass balance fluctuations, terminus variations, and trends for glacier ${agentGlacierName} (WGMS ID: ${agentGlacierId || 'N/A'}) in ${agentCountry || 'the registry'}.`;
        } else if (isGlobalScope) {
          queryDesc = `Synthesize global cryospheric mass balance loss, worldwide terminus retreat distributions, and planetary melt dynamics across all 34 countries in the WGMS catalog from ${f.startDate || '1950'} to ${f.endDate || '2025'}.`;
          agentCountry = undefined;
          agentGlacierName = 'Global Cryosphere (All Monitored Glaciers)';
        } else {
          queryDesc = `Analyze Swiss Alpine glacier mass balance loss, terminus retreat, and decadal deficit regimes in Switzerland from ${f.startDate || '1950'} to ${f.endDate || '2025'}.`;
          agentCountry = 'CH';
          agentGlacierName = 'Swiss Alpine Glaciers (Switzerland)';
          agentGlacierId = detail?.id;
        }

        const agentPayload = {
          query: queryDesc,
          country: agentCountry,
          glacier_id: agentGlacierId ? Number(agentGlacierId) : undefined,
          glacier_name: agentGlacierName,
          start_date: f.startDate || '1950-01-01',
          end_date: f.endDate || '2025-12-31',
        };

        setWorkflowProgress((prev) => ({
          stageIndex: 6,
          stageStatus: { ...prev.stageStatus, ai_dispatch: 'completed', finalizing: 'running' },
          message: `Finalizing scientific report with Gemini-3.6-Flash...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        const agentResult = await api.runAgentAnalysis(agentPayload);
        setAiReport(agentResult);

        // Workflow Completed Successfully
        setWorkflowProgress((prev) => ({
          stageIndex: 7,
          stageStatus: {
            retrieval: 'completed',
            validation: 'completed',
            numerical: 'completed',
            trends: 'completed',
            charts: 'completed',
            ai_dispatch: 'completed',
            finalizing: 'completed',
          },
          message: `Analysis completed: Report synthesized successfully.`,
          elapsedSeconds: prev.elapsedSeconds,
        }));
      } catch (err) {
        console.error('Glacier Unified Pipeline Error:', err);
        setError(err.message);
        setWorkflowProgress((prev) => ({
          ...prev,
          stageStatus: { ...prev.stageStatus, finalizing: 'failed' },
          message: `Workflow halted: ${err.message}`,
        }));
      } finally {
        stopWorkflowTimer();
        setIsWorkflowRunning(false);
      }
    },
    [glacierFilters, glacierPageSize, selectedGlacier]
  );

  // --- 2. UNIFIED THERMAL ANALYSIS PIPELINE ---
  const runThermalAnalysisUnified = useCallback(
    async (overrideFilters, targetPage = 1) => {
      setHasRunThermalAnalysis(true);
      setIsWorkflowRunning(true);
      setError(null);
      startWorkflowTimer();

      const f = overrideFilters || thermalFilters;

      try {
        // Stage 0: Retrieval
        setWorkflowProgress({
          stageIndex: 0,
          stageStatus: { retrieval: 'running' },
          message: `Querying NASA FIRMS MODIS detections for ${f.country || 'Singapore'} (${f.year})...`,
          elapsedSeconds: 0,
        });

        const [geojson, detectionsRes] = await Promise.all([
          api.getModisGeoJSON({
            country: f.country || undefined,
            year: f.year,
            start_date: f.startDate || undefined,
            end_date: f.endDate || undefined,
            max_features: 1500,
          }),
          api.getModisDetections({
            country: f.country || undefined,
            year: f.year,
            start_date: f.startDate || undefined,
            end_date: f.endDate || undefined,
            satellite: f.satellite || undefined,
            daynight: f.daynight || undefined,
            min_confidence: f.minConfidence || undefined,
            min_frp: f.minFRP || undefined,
            page: targetPage,
            page_size: thermalPageSize,
          }),
        ]);

        setThermalGeoJSON(geojson);
        setThermalDetections(detectionsRes.items || []);
        setThermalTotal(detectionsRes.total || 0);

        // Stage 1: Validation
        setWorkflowProgress((prev) => ({
          stageIndex: 1,
          stageStatus: { ...prev.stageStatus, retrieval: 'completed', validation: 'running' },
          message: `Validating ${detectionsRes.total || 0} active fire and thermal anomaly records...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        await new Promise((r) => setTimeout(r, 200));

        // Auto-select first detection
        if (detectionsRes.items && detectionsRes.items.length > 0) {
          handleSelectThermal(detectionsRes.items[0], false);
        }

        // Stage 2: Numerical Calculations & DBSCAN
        setWorkflowProgress((prev) => ({
          stageIndex: 2,
          stageStatus: { ...prev.stageStatus, validation: 'completed', numerical: 'running' },
          message: `Aggregating Fire Radiative Power (FRP), brightness temp & DBSCAN clustering...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        const analysisRes = await api.analyzeModis({
          country: f.country || 'Singapore',
          year: f.year,
          start_date: f.startDate || undefined,
          end_date: f.endDate || undefined,
          satellite: f.satellite || undefined,
          daynight: f.daynight || undefined,
          min_confidence: f.minConfidence || undefined,
          min_frp: f.minFRP || undefined,
          include_clustering: f.includeClustering || false,
          eps_km: f.epsKm || 15.0,
          min_samples: f.minSamples || 3,
        });

        setThermalAnalysis(analysisRes);

        // Stage 3 & 4: Trends and Analytical Charts
        setWorkflowProgress((prev) => ({
          stageIndex: 3,
          stageStatus: { ...prev.stageStatus, numerical: 'completed', trends: 'completed', charts: 'running' },
          message: `Building Terra vs Aqua comparisons & temporal frequency charts...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        await new Promise((r) => setTimeout(r, 200));

        // Stage 5 & 6: LangGraph AI Dispatch & Gemini Finalization
        setWorkflowProgress((prev) => ({
          stageIndex: 5,
          stageStatus: { ...prev.stageStatus, charts: 'completed', ai_dispatch: 'running', finalizing: 'pending' },
          message: `Dispatching thermal anomaly telemetry to LangGraph workflow...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        const targetCountry = f.country || 'Singapore';
        const targetYear = f.year || 2025;

        const agentPayload = {
          query: `Analyze MODIS active fire detections and radiant anomaly patterns in ${targetCountry} for ${targetYear}, evaluating FRP distributions and Terra/Aqua sensor overpasses.`,
          country: targetCountry,
          start_date: f.startDate || `${targetYear}-01-01`,
          end_date: f.endDate || `${targetYear}-12-31`,
        };

        setWorkflowProgress((prev) => ({
          stageIndex: 6,
          stageStatus: { ...prev.stageStatus, ai_dispatch: 'completed', finalizing: 'running' },
          message: `Synthesizing peer-review caliber scientific report with Gemini-3.6-Flash...`,
          elapsedSeconds: prev.elapsedSeconds,
        }));

        const agentResult = await api.runAgentAnalysis(agentPayload);
        setAiReport(agentResult);

        // Workflow Completed Successfully
        setWorkflowProgress((prev) => ({
          stageIndex: 7,
          stageStatus: {
            retrieval: 'completed',
            validation: 'completed',
            numerical: 'completed',
            trends: 'completed',
            charts: 'completed',
            ai_dispatch: 'completed',
            finalizing: 'completed',
          },
          message: `Thermal analysis completed: Full report generated.`,
          elapsedSeconds: prev.elapsedSeconds,
        }));
      } catch (err) {
        console.error('Thermal Unified Pipeline Error:', err);
        setError(err.message);
        setWorkflowProgress((prev) => ({
          ...prev,
          stageStatus: { ...prev.stageStatus, finalizing: 'failed' },
          message: `Workflow halted: ${err.message}`,
        }));
      } finally {
        stopWorkflowTimer();
        setIsWorkflowRunning(false);
      }
    },
    [thermalFilters, thermalPageSize]
  );

  // Standby initial state: Analysis only runs when user explicitly initiates it via Run Analysis button
  // (Auto-run on mount removed per user specification)

  // Handle Glacier Selection
  const handleSelectGlacier = useCallback(async (glacier, updateUnified = true) => {
    setSelectedGlacier(glacier);
    setLoadingGlacierDetail(true);

    if (updateUnified) {
      setSelectedFeature({
        id: glacier.id,
        name: glacier.name || `Glacier #${glacier.id}`,
        country: glacier.country,
        coordinates: [Number(glacier.longitude), Number(glacier.latitude)],
        module: 'glacier',
        elevation: glacier.elevation,
      });
    }

    try {
      const detail = await api.getGlacierDetail(glacier.id);
      setGlacierDetail(detail);
    } catch (err) {
      console.warn(`Could not fetch details for glacier ${glacier.id}:`, err);
      setGlacierDetail(glacier);
    } finally {
      setLoadingGlacierDetail(false);
    }
  }, []);

  // Handle Thermal Selection
  const handleSelectThermal = useCallback((det, updateUnified = true) => {
    setSelectedThermal(det);
    if (updateUnified) {
      setSelectedFeature({
        id: det.id || `${det.latitude}_${det.longitude}`,
        name: `Thermal Detection (${det.satellite || 'MODIS'})`,
        country: det.country || thermalFilters.country,
        coordinates: [Number(det.longitude), Number(det.latitude)],
        module: 'thermal',
        frp: det.frp,
        brightness: det.brightness,
        confidence: det.confidence,
        acq_date: det.acq_date,
      });
    }
  }, [thermalFilters.country]);

  // Clear current geographical selection
  const clearSelection = useCallback(() => {
    setSelectedFeature(null);
    setSelectedGlacier(null);
    setSelectedThermal(null);
  }, []);

  // Quick Jump Navigation Handler
  const handleQuickJump = useCallback(
    (region) => {
      if (activeModule === 'glaciers') {
        const nextFilters = { ...glacierFilters, country: region.country || '' };
        setGlacierFilters(nextFilters);
        runGlacierAnalysisUnified(nextFilters, 1, region.glacierId || null);
      } else {
        const nextFilters = { ...thermalFilters, country: region.country || 'Singapore' };
        setThermalFilters(nextFilters);
        runThermalAnalysisUnified(nextFilters, 1);
      }

      // Fly camera
      setSelectedFeature({
        id: region.glacierId ? `glacier-${region.glacierId}` : `region-${region.name}`,
        name: region.name,
        coordinates: [region.lon, region.lat],
        height: region.height || 450000,
        module: activeModule,
      });
    },
    [activeModule, glacierFilters, thermalFilters, runGlacierAnalysisUnified, runThermalAnalysisUnified]
  );

  return {
    activeView,
    setActiveView,
    activeModule,
    setActiveModule,
    backendConnected,
    loading: isWorkflowRunning,
    isWorkflowRunning,
    workflowProgress,
    error,
    availableCountries,

    // Glacier Module
    glacierFilters,
    setGlacierFilters,
    glacierPage,
    setGlacierPage: (p) => {
      setGlacierPage(p);
      runGlacierAnalysisUnified(undefined, p);
    },
    glacierPageSize,
    glacierList,
    glacierTotal,
    glacierGeoJSON,
    selectedGlacier,
    glacierDetail,
    regionalGlacierStats,
    loadingGlacierDetail,
    handleSelectGlacier,
    hasRunGlacierAnalysis,
    hasRunThermalAnalysis,
    hasRunAnalysis: activeModule === 'glaciers' ? hasRunGlacierAnalysis : hasRunThermalAnalysis,
    runGlacierQuery: () => runGlacierAnalysisUnified(glacierFilters, 1),
    resetGlacierFilters: () => {
      const def = { country: 'CH', query: '', glacierId: '', startDate: '1950-01-01', endDate: '2025-12-31', analysisType: 'all' };
      setGlacierFilters(def);
      setHasRunGlacierAnalysis(false);
      setGlacierList([]);
      setGlacierTotal(0);
      setSelectedGlacier(null);
      setGlacierDetail(null);
      setRegionalGlacierStats(null);
      setAiReport(null);
      setSelectedFeature(null);
    },

    // Thermal Module
    thermalFilters,
    setThermalFilters,
    thermalPage,
    setThermalPage: (p) => {
      setThermalPage(p);
      runThermalAnalysisUnified(undefined, p);
    },
    thermalPageSize,
    thermalDetections,
    thermalTotal,
    thermalGeoJSON,
    selectedThermal,
    thermalAnalysis,
    handleSelectThermal,
    runThermalQuery: () => runThermalAnalysisUnified(thermalFilters, 1),
    resetThermalFilters: () => {
      const def = { country: 'Singapore', year: 2025, startDate: '', endDate: '', satellite: '', daynight: '', minConfidence: 0, minFRP: '', includeClustering: false, epsKm: 15, minSamples: 3 };
      setThermalFilters(def);
      setHasRunThermalAnalysis(false);
      setThermalDetections([]);
      setThermalTotal(0);
      setSelectedThermal(null);
      setThermalAnalysis(null);
      setAiReport(null);
      setSelectedFeature(null);
    },

    // Unified Cesium Selection & Navigation
    selectedFeature,
    setSelectedFeature,
    clearSelection,
    handleQuickJump,

    // AI Intelligence Report
    aiReport,

    // Global Refresh
    refreshAll: () => {
      if (activeModule === 'glaciers') runGlacierAnalysisUnified(glacierFilters, 1);
      else runThermalAnalysisUnified(thermalFilters, 1);
    },
  };
}
