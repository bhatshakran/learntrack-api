/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AtRiskLearner, Learner, Program, QualityReport } from "./types";
import Sidebar from "./sidebar";
import { StatCard } from "./statCard";
import LearnerRow from "./learnerRow";
import DataQualityPanel from "./dataQualityPanel";
import { shortId, USER_MAP } from "@/lib/constants";
import { LeaderboardDialog } from "../leaderboard/page";
import { IconSpinner } from "./iconSpinner";

export default function DashboardPage() {
  const [apiBase, setApiBase] = useState(
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000",
  );
  const [programs, setPrograms] = useState<Program[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [riskList, setRiskList] = useState<AtRiskLearner[]>([]);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "risk" | "complete">(
    "all",
  );
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<{
    fixed_count: number;
    fixed: any[];
  } | null>(null);

  const fixInconsistentProgress = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const res = await fetch(
        `${apiBase}/admin/data-quality/fix-inconsistent-progress`,
        { method: "POST" },
      );
      const data = await res.json();
      setFixResult(data);
      // Refresh quality report after fix
      const q = await apiFetch("/admin/data-quality/report").catch(() => null);
      setQuality(q);
    } catch (e) {
      console.error("Fix failed:", e);
    } finally {
      setFixing(false);
    }
  };

  const apiFetch = useCallback(
    async (path: string, signal?: AbortSignal) => {
      const url = apiBase.replace(/\/$/, "") + path;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return res.json();
    },
    [apiBase],
  );

  useEffect(() => {
    const ac = new AbortController();

    async function loadAll() {
      setLoading(true);
      try {
        // 1. Fetch Programs
        const pData = await apiFetch("/programs", ac.signal);
        const progs: Program[] = pData.programs || [];
        setPrograms(progs);

        // 2. Fetch Learners for all programs
        // We use Promise.allSettled so one failing program doesn't break the whole dashboard
        const learnerPromises = progs.map((p) =>
          apiFetch(`/admin/programs/${p.id}/learners`, ac.signal),
        );
        const riskPromises = progs.map((p) =>
          apiFetch(`/admin/programs/${p.id}/at-risk-learners`, ac.signal),
        );

        const learnerResults = await Promise.allSettled(learnerPromises);
        const riskResults = await Promise.allSettled(riskPromises);

        const allLearners: Learner[] = [];
        learnerResults.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value.learners) {
            result.value.learners.forEach((l: any) => {
              allLearners.push({
                ...l,
                programTitle: progs[idx].title,
                programId: progs[idx].id,
              });
            });
          }
        });

        const allRisk: AtRiskLearner[] = [];
        riskResults.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value.at_risk_learners) {
            result.value.at_risk_learners.forEach((r: any) => {
              allRisk.push({ ...r, programTitle: progs[idx].title });
            });
          }
        });

        setLearners(allLearners);
        setRiskList(allRisk);

        // 3. Quality Report
        const q = await apiFetch("/admin/data-quality/report", ac.signal).catch(
          () => null,
        );
        setQuality(q);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Dashboard load failed:", err);
        }
      } finally {
        setLoading(false);
      }
    }

    loadAll();
    return () => ac.abort();
  }, [apiBase, apiFetch]);

  // --- REVISED FILTERING LOGIC ---
  const filtered = useMemo(() => {
    return learners.filter((l) => {
      // First, filter by selected program from sidebar
      if (selectedProgram && l.programId !== selectedProgram.id) return false;

      // Then, filter by status dropdown
      if (filter === "active") return (l.streak_days || 0) > 0;
      if (filter === "risk") return l.is_at_risk;
      if (filter === "complete") return (l.progress_percent || 0) >= 100;

      return true;
    });
  }, [learners, filter, selectedProgram]);

  const avgProgress = useMemo(() => {
    const targetSet = filtered.length > 0 ? filtered : learners;
    if (!targetSet.length) return 0;
    return Math.round(
      targetSet.reduce((s, l) => s + (l.progress_percent || 0), 0) /
        targetSet.length,
    );
  }, [filtered, learners]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex">
        <Sidebar
          programs={programs}
          onSelectProgram={(p) =>
            setSelectedProgram((prev) => (prev?.id === p.id ? null : p))
          }
          selected={selectedProgram?.id ?? null}
        />

        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-serif font-bold">
                {selectedProgram ? selectedProgram.title : "Global"}{" "}
                <span className="text-violet-400 italic">Overview</span>
              </h1>
              {selectedProgram && (
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="text-xs text-violet-400 hover:underline mt-1"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                onClick={() => setLeaderboardOpen(true)}
                className="px-4 py-2 rounded-md border border-violet-700 bg-violet-900/40 hover:bg-violet-800/50 text-violet-300 text-sm transition"
              >
                🏆 Leaderboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 transition"
              >
                {loading ? <IconSpinner /> : "Refresh"}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Enrollments"
              value={filtered.length}
              subtitle="Showing filtered results"
            />
            <StatCard
              title="Avg. Progress"
              value={`${avgProgress}%`}
              colorClass="text-emerald-400"
            />
            <StatCard
              title="At-Risk"
              value={
                riskList.filter(
                  (r) =>
                    !selectedProgram ||
                    learners.find((l) => l.enrollment_id === r.enrollment_id)
                      ?.programId === selectedProgram.id,
                ).length
              }
              colorClass="text-rose-400"
            />
            <StatCard
              title="Programs"
              value={programs.length}
              colorClass="text-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Table */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <span className="font-semibold">Learner Progress</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="bg-slate-800 text-sm px-3 py-1.5 rounded-md border border-slate-700 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active (Streak {">"} 0)</option>
                  <option value="risk">At Risk Only</option>
                  <option value="complete">Completed</option>
                </select>
              </div>
              <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic">
                    {loading
                      ? "Fetching data..."
                      : "No learners found for this selection."}
                  </div>
                ) : (
                  filtered.map((l) => (
                    <LearnerRow
                      key={`${l.enrollment_id}-${l.programId}`}
                      learner={l}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Urgent Attention
                </h3>
                <div className="space-y-3">
                  {riskList.slice(0, 5).map((r) => (
                    <div
                      key={r.enrollment_id}
                      className="p-3 bg-slate-950 border border-rose-900/30 rounded-lg"
                    >
                      <div className="text-sm font-medium flex justify-between">
                        <span>{USER_MAP[r.user_id] || shortId(r.user_id)}</span>
                        <span className="text-rose-400">
                          {r.progress_percent}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 uppercase">
                        {r.programTitle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality Box */}
              <DataQualityPanel
                quality={quality}
                fixing={fixing}
                fixResult={fixResult}
                onFix={fixInconsistentProgress}
              />
            </div>
          </div>
        </main>
      </div>
      <LeaderboardDialog
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        apiBase={apiBase}
        programs={programs}
      />
    </div>
  );
}
