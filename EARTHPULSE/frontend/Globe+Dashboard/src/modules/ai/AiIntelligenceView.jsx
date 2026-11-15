import React, { useState } from 'react';
import { Sparkles, Brain, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Send, Clock, Layers } from 'lucide-react';
import { api } from '../../services/api';

const SAMPLE_QUERIES = [
  'Analyze MODIS thermal anomaly detections in Singapore for 2025',
  'Evaluate mass balance fluctuations for Hintereisferner (WGMS ID 235) in Austria',
  'Summarize recent fire radiative power (FRP) and temporal trends in Australia',
  'Investigate retreat trends and front variation of Rhonegletscher in Switzerland',
];

export default function AiIntelligenceView({
  prefillQuery = '',
  prefillCountry = '',
  prefillGlacierId = null,
}) {
  const [query, setQuery] = useState(prefillQuery || SAMPLE_QUERIES[0]);
  const [country, setCountry] = useState(prefillCountry || '');
  const [glacierId, setGlacierId] = useState(prefillGlacierId || '');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const payload = {
        query: query.trim(),
        country: country || undefined,
        glacier_id: glacierId ? Number(glacierId) : undefined,
        start_date: '2022-01-01',
        end_date: '2025-12-31',
      };
      const res = await api.runAgentAnalysis(payload);
      setReport(res);
    } catch (err) {
      console.error('Agent analysis failed:', err);
      setError(err.message || 'Failed to generate scientific report with LangGraph agent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950/50 to-slate-950 border border-indigo-800/60 rounded-xl p-5 shadow-xl shadow-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Autonomous Scientific Agent
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                LangGraph + Gemini 3.6 Flash
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Numerical analysis is computed by deterministic Python pipelines (WGMS / MODIS); Gemini synthesizes validated telemetry into peer-review caliber environmental reports.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">
              SCIENTIFIC RESEARCH QUERY
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter query, e.g. Analyze 2025 thermal anomalies in Singapore..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Synthesizing...' : 'Generate Report'}</span>
              </button>
            </div>
          </div>

          {/* Sample Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Suggested:</span>
            {SAMPLE_QUERIES.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(sq)}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900/80 hover:bg-indigo-950 hover:text-indigo-300 border border-slate-800 text-slate-400 transition-colors"
              >
                {sq.length > 55 ? `${sq.slice(0, 52)}...` : sq}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-semibold text-slate-200 text-sm">
            Executing LangGraph Multi-Node Analysis Pipeline...
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Query Understanding → Data Retrieval → Python Numerical Analysis → Result Validation → Gemini-3.6-Flash Scientific Synthesis
          </p>
        </div>
      )}

      {/* Error Card */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 text-rose-300 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Agent Execution Warning</div>
            <p className="text-rose-200 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Generated Report Card */}
      {report && !loading && (
        <div className="bg-slate-900/80 border border-indigo-900/60 rounded-xl p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">
                Autonomous Scientific Intelligence Report
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                STATUS: {report.status || report.execution_status || 'VERIFIED'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                DOMAIN: {report.domain ? report.domain.toUpperCase() : 'CRYOSPHERE / THERMAL'}
              </span>
            </div>
          </div>

          {/* Report Body */}
          <div className="prose prose-invert max-w-none text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-slate-950/70 p-4 rounded-lg border border-slate-800 font-sans">
            {report.report || report.summary || JSON.stringify(report, null, 2)}
          </div>

          {/* Metadata & Datasets Used */}
          {report.datasets_used && report.datasets_used.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>DATASETS ACCESSED:</span>
              {report.datasets_used.map((ds, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {ds}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
