/* eslint-disable @typescript-eslint/no-explicit-any */
import { downloadQualityReportPDF } from "@/lib/downloadQualityPdf";
import { IconSpinner } from "./iconSpinner";
import { QualityReport } from "./types";

function DataQualityPanel({
  quality,
  fixing,
  fixResult,
  onFix,
}: {
  quality: QualityReport | null;
  fixing: boolean;

  fixResult: { fixed_count: number; fixed: any[] } | null;
  onFix: () => void;
}) {
  const ANOMALY_META = [
    {
      key: "progress_over_100" as const,
      label: "Progress Over 100%",
      description: "Enrollments with corrupted progress exceeding maximum",
      icon: "↑",
      isArray: true,
    },
    {
      key: "progress_under_0" as const,
      label: "Progress Under 0%",
      description: "Enrollments with negative progress values",
      icon: "↓",
      isArray: true,
    },
    {
      key: "orphaned_completions" as const,
      label: "Orphaned Completions",
      description: "Completions pointing to lessons that no longer exist",
      icon: "⌀",
      isArray: false,
    },
    {
      key: "duplicate_completions" as const,
      label: "Duplicate Completions",
      description: "Same lesson marked complete more than once",
      icon: "⊕",
      isArray: false,
    },
    {
      key: "inconsistent_progress" as const,
      label: "Inconsistent Progress",
      description: "Stored progress doesn't match actual completed lessons",
      icon: "≠",
      isArray: false,
    },
  ];

  const getCount = (key: keyof QualityReport["anomalies"]) => {
    if (!quality) return 0;
    const val = quality.anomalies[key];
    return Array.isArray(val) ? val.length : (val as number);
  };

  const totalAnomalies = quality
    ? ANOMALY_META.reduce((sum, m) => sum + getCount(m.key), 0)
    : 0;

  const isClean = totalAnomalies === 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Data Quality Report
          </h3>
          {quality && (
            <p className="text-xs text-slate-500 mt-0.5">
              {quality.total_enrollments_checked} enrollments checked
            </p>
          )}
        </div>
        <button
          onClick={() => quality && downloadQualityReportPDF(quality)}
          disabled={!quality}
          title="Download Quality Report"
          className="p-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <div
          className={`text-xs font-mono px-2 py-1 rounded-full border ${
            isClean
              ? "bg-emerald-950 text-emerald-400 border-emerald-900"
              : "bg-rose-950 text-rose-400 border-rose-900"
          }`}
        >
          {isClean ? "✓ All Clear" : `${totalAnomalies} issues`}
        </div>
      </div>

      {/* Anomaly rows */}
      {quality ? (
        <div className="divide-y divide-slate-800/60">
          {ANOMALY_META.map(({ key, label, description, icon }) => {
            const count = getCount(key);
            const hasIssue = count > 0;
            return (
              <div
                key={key}
                className={`px-5 py-3 flex items-center gap-4 ${hasIssue ? "bg-rose-950/10" : ""}`}
              >
                <div
                  className={`text-lg font-mono w-6 text-center ${hasIssue ? "text-rose-400" : "text-slate-600"}`}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-semibold ${hasIssue ? "text-rose-300" : "text-slate-400"}`}
                  >
                    {label}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                    {description}
                  </div>
                </div>
                <div
                  className={`text-lg font-mono font-bold tabular-nums ${hasIssue ? "text-rose-400" : "text-emerald-500"}`}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-slate-600 text-sm italic">
          No report available
        </div>
      )}

      {/* Details */}
      {quality?.details && quality.details.length > 0 && (
        <div className="border-t border-slate-800 px-5 py-3 max-h-40 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase text-slate-600 mb-2 tracking-wider">
            Details
          </div>
          <div className="space-y-1.5">
            {quality.details.map((d: any, i: number) => (
              <div
                key={i}
                className="text-[10px] font-mono text-slate-500 bg-slate-950 rounded px-2 py-1.5 flex items-start gap-2"
              >
                <span className="text-rose-500 shrink-0">[{d.type}]</span>
                <span className="break-all">
                  {d.enrollment_id &&
                    `enrollment: ${d.enrollment_id.slice(0, 8)}…`}
                  {d.lesson_id && ` lesson: ${d.lesson_id.slice(0, 8)}…`}
                  {d.stored_progress != null &&
                    ` stored: ${d.stored_progress}%`}
                  {d.actual_progress != null &&
                    ` actual: ${d.actual_progress}%`}
                  {d.difference != null &&
                    ` diff: ${d.difference > 0 ? "+" : ""}${d.difference}%`}
                  {d.count != null && ` ×${d.count}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fix button */}
      <div className="border-t border-slate-800 px-5 py-4">
        {fixResult && (
          <div
            className={`text-xs font-mono mb-3 px-3 py-2 rounded-lg border ${
              fixResult.fixed_count > 0
                ? "bg-emerald-950 text-emerald-400 border-emerald-900"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {fixResult.fixed_count > 0
              ? `✓ Fixed ${fixResult.fixed_count} enrollment${fixResult.fixed_count !== 1 ? "s" : ""}`
              : "✓ Nothing to fix — all progress is consistent"}
          </div>
        )}

        <button
          onClick={onFix}
          disabled={fixing || isClean}
          className={`w-full py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 ${
            isClean
              ? "bg-slate-800 text-slate-600 cursor-not-allowed"
              : fixing
                ? "bg-violet-900 text-violet-300 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-500 text-white cursor-pointer"
          }`}
        >
          {fixing ? (
            <>
              <IconSpinner /> Fixing…
            </>
          ) : (
            "Fix Inconsistent Progress"
          )}
        </button>
        {isClean && (
          <p className="text-[10px] text-slate-600 text-center mt-2">
            No inconsistencies to fix
          </p>
        )}
      </div>
    </div>
  );
}

export default DataQualityPanel;
