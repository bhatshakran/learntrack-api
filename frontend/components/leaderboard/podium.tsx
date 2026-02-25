import { avatarGradient, USER_MAP } from "@/lib/constants";
import { LeaderboardEntry, RANK_COLORS } from "./types";

// ── Podium for top 3 ──────────────────────────────────────────────────────
export function Podium({ top3 }: { top3: LeaderboardEntry[] }) {
  // Render order: 2nd, 1st, 3rd
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };

  return (
    <div className="flex items-end justify-center gap-3 py-6 px-4">
      {order.map((entry) => {
        const name = USER_MAP[entry.user_id] || entry.user_id.slice(0, 8);
        const r = RANK_COLORS[entry.rank] ?? RANK_COLORS[3];
        const isFirst = entry.rank === 1;

        return (
          <div
            key={entry.enrollment_id}
            className="flex flex-col items-center gap-2"
          >
            {/* Avatar */}
            <div className="relative">
              {isFirst && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl">
                  👑
                </div>
              )}
              <div
                className={`
                w-12 h-12 rounded-full bg-linear-to-br ${avatarGradient(entry.user_id)}
                flex items-center justify-center text-white font-bold text-lg
                shadow-lg ${r.glow}
                ${isFirst ? "ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-slate-900" : ""}
              `}
              >
                {name.charAt(0)}
              </div>
            </div>

            {/* Name + progress */}
            <div className="text-center">
              <div
                className={`text-xs font-bold ${isFirst ? "text-slate-100" : "text-slate-400"}`}
              >
                {name.split(" ")[0]}
              </div>
              <div className={`text-[10px] font-mono ${r.text}`}>
                {entry.progress_percent}%
              </div>
            </div>

            {/* Podium block */}
            <div
              className={`
              w-20 ${heights[entry.rank as 1 | 2 | 3] ?? "h-10"}
              bg-linear-to-t ${r.bar} opacity-80 rounded-t-md
              flex items-start justify-center pt-1.5
            `}
            >
              <span className="text-white font-bold text-sm">
                #{entry.rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
