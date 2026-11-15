import React, { useState } from 'react';
import { Sparkles, BrainCircuit, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function AiReportView({ report, loading, onRequestReport, activeModule, selectedFeature }) {
  const [customPrompt, setCustomPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onRequestReport(customPrompt);
    setCustomPrompt('');
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              LangGraph Autonomous AI Intelligence
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Powered by Google Gemini 3.6 Flash</span>
          </div>
        </div>

        <button
          onClick={() => onRequestReport()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Synthesizing...' : 'Generate Report'}</span>
        </button>
      </div>

      {/* Custom Natural Language Query Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder={`Ask AI about ${selectedFeature ? selectedFeature.name : activeModule + ' dynamics'}...`}
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !customPrompt.trim()}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Report Display Area */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Running multi-node LangGraph analysis & Gemini synthesis...</span>
        </div>
      ) : report ? (
        <div className="prose prose-invert prose-xs max-w-none max-h-96 overflow-y-auto pr-1 text-slate-300 font-sans leading-relaxed space-y-2 text-xs bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
          {report.split('\n\n').map((paragraph, idx) => {
            if (paragraph.startsWith('# ')) {
              return <h1 key={idx} className="text-base font-bold text-cyan-300 mt-2 mb-1">{paragraph.replace('# ', '')}</h1>;
            }
            if (paragraph.startsWith('## ')) {
              return <h2 key={idx} className="text-sm font-semibold text-white mt-2 mb-1">{paragraph.replace('## ', '')}</h2>;
            }
            if (paragraph.startsWith('*   ') || paragraph.startsWith('- ')) {
              return (
                <ul key={idx} className="list-disc pl-4 space-y-1 text-slate-300">
                  {paragraph.split('\n').map((item, itemIdx) => (
                    <li key={itemIdx}>{item.replace(/^(\*   |- )/, '')}</li>
                  ))}
                </ul>
              );
            }
            return <p key={idx} className="text-slate-300">{paragraph}</p>;
          })}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500 font-mono">
          Click "Generate Report" or ask a question to run an autonomous multi-node reasoning analysis on the active dataset.
        </div>
      )}
    </div>
  );
}
