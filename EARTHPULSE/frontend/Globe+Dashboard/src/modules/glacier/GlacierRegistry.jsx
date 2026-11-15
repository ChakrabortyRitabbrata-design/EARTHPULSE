import React, { useState } from 'react';
import { Mountain, ChevronLeft, ChevronRight, Navigation, CheckCircle2 } from 'lucide-react';

export default function GlacierRegistry({
  glaciers = [],
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  selectedGlacier,
  onSelectGlacier,
  loading,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGlaciers = glaciers.filter((g) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const gName = (g.short_name || g.names || g.name || '').toLowerCase();
    return (
      gName.includes(term) ||
      (g.country && g.country.toLowerCase().includes(term)) ||
      (g.id && String(g.id).includes(term))
    );
  });

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg overflow-hidden flex flex-col">
      {/* Registry Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Mountain className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-xs text-slate-200">
            WGMS GLACIER REGISTRY
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
            {total} RECORDED
          </span>
        </div>

        <input
          type="text"
          placeholder="Filter page items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 w-36 focus:outline-none focus:border-cyan-500 font-sans"
        />
      </div>

      {/* Registry Table */}
      <div className="overflow-x-auto min-h-[160px] max-h-[260px] overflow-y-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] font-mono text-slate-400 select-none">
              <th className="py-2 px-3">GLACIER NAME</th>
              <th className="py-2 px-2">ID</th>
              <th className="py-2 px-2">ISO</th>
              <th className="py-2 px-2">COORDINATES</th>
              <th className="py-2 px-2">ELEVATION</th>
              <th className="py-2 px-2 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && glaciers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                  Retrieving WGMS registry from FastAPI...
                </td>
              </tr>
            ) : filteredGlaciers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No glaciers found matching the query.
                </td>
              </tr>
            ) : (
              filteredGlaciers.map((g) => {
                const isSelected = selectedGlacier && selectedGlacier.id === g.id;
                const latStr = g.latitude !== undefined && g.latitude !== null ? Number(g.latitude).toFixed(3) : '—';
                const lonStr = g.longitude !== undefined && g.longitude !== null ? Number(g.longitude).toFixed(3) : '—';

                return (
                  <tr
                    key={g.id}
                    onClick={() => onSelectGlacier && onSelectGlacier(g)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 text-cyan-200 border-l-2 border-l-cyan-400'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 font-medium flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 shrink-0" />
                      )}
                      <span className="truncate max-w-[140px]" title={g.short_name || g.names || g.name || `Glacier #${g.id}`}>
                        {g.short_name || g.names || g.name || `Glacier #${g.id}`}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-400">
                      {g.id}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-cyan-400 font-semibold">
                      {g.country || '—'}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-400">
                      {latStr}°, {lonStr}°
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-300">
                      {g.elevation ? `${g.elevation}m` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectGlacier && onSelectGlacier(g);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-600'
                        }`}
                      >
                        {isSelected ? 'ACTIVE' : 'NAVIGATE'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          Showing page {page} of {totalPages} ({total} glaciers)
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange && onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200">
            {page}
          </span>
          <button
            onClick={() => onPageChange && onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
