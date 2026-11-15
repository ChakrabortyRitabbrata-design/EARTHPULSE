import React from 'react';
import { Flame, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function ThermalRegistry({
  detections = [],
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  selectedDetection,
  onSelectDetection,
  loading,
}) {
  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-lg overflow-hidden flex flex-col">
      {/* Registry Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-xs text-slate-200">
            MODIS THERMAL DETECTION REGISTRY
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
            {total} DETECTIONS
          </span>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Page {page} of {totalPages}
        </div>
      </div>

      {/* Registry Table */}
      <div className="overflow-x-auto min-h-[160px] max-h-[260px] overflow-y-auto no-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/80 text-[10px] font-mono text-slate-400 select-none">
              <th className="py-2 px-3">RECORD ID</th>
              <th className="py-2 px-2">COORDINATES</th>
              <th className="py-2 px-2">DATE & TIME</th>
              <th className="py-2 px-2">SATELLITE</th>
              <th className="py-2 px-2">FRP (MW)</th>
              <th className="py-2 px-2">BRIGHTNESS</th>
              <th className="py-2 px-2">CONF</th>
              <th className="py-2 px-2 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && detections.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                  Querying MODIS detections from FastAPI backend...
                </td>
              </tr>
            ) : detections.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-mono text-xs">
                  No thermal anomalies found for applied filters.
                </td>
              </tr>
            ) : (
              detections.map((det, idx) => {
                const detId = det.id || det.event_id || `det-${idx}`;
                const isSelected =
                  selectedDetection &&
                  (selectedDetection.id === detId ||
                    (selectedDetection.latitude === det.latitude &&
                      selectedDetection.longitude === det.longitude &&
                      selectedDetection.acq_date === det.acq_date));

                const latStr = det.latitude !== undefined ? Number(det.latitude).toFixed(3) : '—';
                const lonStr = det.longitude !== undefined ? Number(det.longitude).toFixed(3) : '—';
                const frpVal = det.frp !== undefined && det.frp !== null ? Number(det.frp).toFixed(1) : '—';
                const brightVal = det.brightness !== undefined ? `${Number(det.brightness).toFixed(1)} K` : '—';
                const confVal = det.confidence !== undefined ? `${det.confidence}%` : '—';

                return (
                  <tr
                    key={detId}
                    onClick={() => onSelectDetection && onSelectDetection(det)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-950/60 text-amber-200 border-l-2 border-l-amber-400'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
                      )}
                      <span>#{idx + 1 + (page - 1) * pageSize}</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-400">
                      {latStr}°, {lonStr}°
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-300">
                      {det.acq_date} {det.acq_time ? `${det.acq_time}Z` : ''}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px]">
                      <span className={`px-1 py-0.5 rounded text-[10px] ${
                        det.satellite === 'Aqua'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {det.satellite || 'MODIS'}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-amber-400 font-bold">
                      {frpVal}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] text-slate-300">
                      {brightVal}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px]">
                      <span className={`font-semibold ${
                        det.confidence >= 80
                          ? 'text-rose-400'
                          : det.confidence >= 30
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}>
                        {confVal}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDetection && onSelectDetection(det);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-600'
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
          Showing page {page} of {totalPages} ({total} detections)
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
