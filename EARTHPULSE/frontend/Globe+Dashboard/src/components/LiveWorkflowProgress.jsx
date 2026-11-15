import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle, Cpu, Activity, Brain } from 'lucide-react';

export const WORKFLOW_STAGES = [
  { id: 'retrieval', label: 'Retrieving Observations', description: 'Querying WGMS / NASA FIRMS registry...' },
  { id: 'validation', label: 'Validating Dataset', description: 'Verifying spatial coordinates and data integrity...' },
  { id: 'numerical', label: 'Numerical Analysis', description: 'Executing Python numerical aggregation & metrics...' },
  { id: 'trends', label: 'Analyzing Historical Trends', description: 'Computing time-series fluctuations & variances...' },
  { id: 'charts', label: 'Generating Analytical Charts', description: 'Synthesizing chart telemetry and distributions...' },
  { id: 'ai_dispatch', label: 'Preparing AI Interpretation', description: 'Dispatching validated state to LangGraph...' },
  { id: 'finalizing', label: 'Finalizing Scientific Report', description: 'Synthesizing report via Gemini-3.6-Flash...' },
];

export default function LiveWorkflowProgress({
  activeStageIndex = 0,
  stageStatus = {},
  customMessage = '',
  elapsedSeconds = 0,
}) {
  return (
    <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-4 shadow-xl shadow-cyan-950/20 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            Live Operational Analysis Workflow
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Elapsed: {elapsedSeconds.toFixed(1)}s</span>
        </div>
      </div>

      {customMessage && (
        <div className="mb-3 px-3 py-1.5 rounded bg-cyan-950/50 border border-cyan-800/40 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
          <span>{customMessage}</span>
        </div>
      )}

      {/* Progress Stages */}
      <div className="space-y-2">
        {WORKFLOW_STAGES.map((stage, idx) => {
          let status = 'pending';
          if (idx < activeStageIndex) status = 'completed';
          else if (idx === activeStageIndex) status = stageStatus[stage.id] || 'running';
          else status = stageStatus[stage.id] || 'pending';

          const isRunning = status === 'running';
          const isCompleted = status === 'completed';
          const isFailed = status === 'failed';

          return (
            <div
              key={stage.id}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                isRunning
                  ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-sm'
                  : isCompleted
                  ? 'bg-slate-950/40 border-slate-800/70 text-slate-300'
                  : isFailed
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  : 'bg-slate-950/20 border-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isRunning && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
                  {isFailed && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {!isCompleted && !isRunning && !isFailed && (
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
                <div>
                  <div className={`font-semibold text-[11px] ${isRunning ? 'text-cyan-300' : isCompleted ? 'text-slate-200' : 'text-slate-400'}`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {stage.description}
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                {isRunning && <span className="text-cyan-400 font-bold animate-pulse">Running</span>}
                {isCompleted && <span className="text-emerald-400 font-semibold">Done</span>}
                {isFailed && <span className="text-rose-400 font-semibold">Failed</span>}
                {!isRunning && !isCompleted && !isFailed && <span className="text-slate-600">Pending</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
