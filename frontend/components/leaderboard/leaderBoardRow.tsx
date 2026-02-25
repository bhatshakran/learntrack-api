import { avatarGradient, timeAgo, USER_MAP } from "@/lib/constants";
import { LeaderboardEntry, MEDAL, RANK_COLORS } from "./types";

// ── Full leaderboard row ──────────────────────────────────────────────────
export function LeaderboardRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const name = USER_MAP[entry.user_id] || entry.user_id.slice(0, 8);
  const r = RANK_COLORS[entry.rank];
  const isTop3 = entry.rank <= 3;

  return (
    <div
      className={`
          flex items-center gap-4 px-5 py-3 transition-colors
          ${isTop3 ? "bg-slate-900/60" : "hover:bg-slate-900/40"}
          ${index !== 0 ? "border-t border-slate-800/50" : ""}
        `}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Rank */}
      <div className="w-8 text-center shrink-0">
        {isTop3 ? (
          <span className="text-base">{MEDAL[entry.rank]}</span>
        ) : (
          <span className="text-xs font-mono text-slate-600">
            #{entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div
        className={`
          w-9 h-9 rounded-full bg-linear-to-br ${avatarGradient(entry.user_id)}
          flex items-center justify-center text-white text-sm font-bold shrink-0
          ${isTop3 ? `shadow-md ${r?.glow}` : ""}
        `}
      >
        {name.charAt(0)}
      </div>

      {/* Name + last active */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-200 truncate">
          {name}
        </div>
        <div className="text-[10px] text-slate-600 mt-0.5">
          last active {timeAgo(entry.last_lesson_completed_at)}
        </div>
      </div>

      {/* Streak */}
      <div className="text-center shrink-0">
        <div className="text-xs font-mono text-amber-400">
          {entry.current_streak_days > 0
            ? `🔥 ${entry.current_streak_days}`
            : "—"}
        </div>
        <div className="text-[9px] text-slate-600 mt-0.5">streak</div>
      </div>

      {/* Progress bar + percent */}
      <div className="w-28 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-xs font-mono font-bold ${r?.text ?? "text-violet-400"}`}
          >
            {entry.progress_percent}%
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-linear-to-r ${r?.bar ?? "from-violet-500 to-violet-400"} transition-all duration-700`}
            style={{ width: `${Math.min(entry.progress_percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
