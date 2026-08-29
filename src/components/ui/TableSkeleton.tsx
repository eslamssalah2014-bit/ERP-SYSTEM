import React from "react";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  summaryCards?: number;
  title?: string;
  isAr?: boolean;
}

export default function TableSkeleton({
  rows = 6,
  columns = 6,
  summaryCards = 4,
  title,
  isAr = true,
}: TableSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse select-none" dir={isAr ? "rtl" : "ltr"}>
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-sm">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-slate-800 rounded-xl" />
          <div className="h-3 w-64 bg-slate-800/60 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-28 bg-slate-800 rounded-xl" />
          <div className="h-9 w-36 bg-emerald-950/40 border border-emerald-800/30 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      {summaryCards > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${summaryCards} gap-4`}>
          {Array.from({ length: summaryCards }).map((_, i) => (
            <div key={i} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-800 rounded-md" />
                <div className="w-8 h-8 rounded-xl bg-slate-800/80" />
              </div>
              <div className="h-7 w-32 bg-slate-800 rounded-lg" />
              <div className="h-2 w-24 bg-slate-800/40 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Table Container Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Table Search / Filter Bar */}
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/30">
          <div className="h-9 w-full sm:w-72 bg-slate-800/80 rounded-xl" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-32 bg-slate-800/80 rounded-xl" />
            <div className="h-9 w-24 bg-slate-800/80 rounded-xl" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-800/60 border-b border-slate-700/60">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="p-4">
                    <div className="h-3.5 bg-slate-700/60 rounded-md w-3/4 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {Array.from({ length: rows }).map((_, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/20">
                  {Array.from({ length: columns }).map((_, cIdx) => (
                    <td key={cIdx} className="p-4">
                      <div
                        className="h-3 bg-slate-800/70 rounded-md"
                        style={{
                          width: `${Math.max(40, 90 - ((rIdx * 7 + cIdx * 13) % 45))}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
