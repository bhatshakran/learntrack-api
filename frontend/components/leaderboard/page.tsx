import { useEffect, useState, useCallback } from "react";
import { LeaderboardResponse } from "./types";
import { Podium } from "./podium";
import { LeaderboardRow } from "./leaderBoardRow";

export function LeaderboardDialog({
  open,
  onClose,
  apiBase,
  programs,
}: {
  open: boolean;
  onClose: () => void;
  apiBase: string;
  programs: { id: string; title: string }[];
}) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProgram, setSelected] = useState<string>("");
  const [limit, setLimit] = useState(10);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (selectedProgram) params.set("programId", selectedProgram);
      const res = await fetch(`${apiBase}/admin/leaderboard?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Leaderboard fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedProgram, limit]);

  useEffect(() => {
    if (open) fetchLeaderboard();
  }, [open, fetchLeaderboard]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const top3 = data?.leaderboard.slice(0, 3) ?? [];
  const rest = data?.leaderboard.slice(3) ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="
          w-full max-w-lg bg-slate-950 border border-slate-800 rounded-2xl
          shadow-2xl shadow-black/60 pointer-events-auto
          flex flex-col max-h-[90vh]
          animate-in fade-in slide-in-from-bottom-4 duration-200
        "
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-100">
                  Leaderboard
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ranked by progress · tiebroken by streak
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mt-4">
              <select
                value={selectedProgram}
                onChange={(e) => setSelected(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 text-sm text-slate-300 px-3 py-1.5 rounded-lg outline-none focus:border-violet-500 transition"
              >
                <option value="">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-sm text-slate-300 px-3 py-1.5 rounded-lg outline-none focus:border-violet-500 transition"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={25}>Top 25</option>
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-600">
                <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Loading…
              </div>
            ) : !data || data.leaderboard.length === 0 ? (
              <div className="py-20 text-center text-slate-600 italic text-sm">
                No learners found
              </div>
            ) : (
              <>
                {/* Podium — only when showing all programs or top3 exists */}
                {top3.length >= 2 && (
                  <div className="border-b border-slate-800/60">
                    <Podium top3={top3} />
                  </div>
                )}

                {/* Full list */}
                <div>
                  {data.leaderboard.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.enrollment_id}
                      entry={entry}
                      index={i}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-600">
              {data
                ? `${data.total} learner${data.total !== 1 ? "s" : ""}`
                : "—"}
            </span>
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="text-xs text-violet-400 hover:text-violet-300 transition disabled:opacity-40"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
