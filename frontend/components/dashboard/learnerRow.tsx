import {
  AVATAR_COLORS,
  progressColor,
  shortId,
  USER_MAP,
} from "@/lib/constants";
import { Learner } from "./types";

function LearnerRow({ learner }: { learner: Learner }) {
  const pct = learner.progress_percent ?? 0;

  // Look up the name, fallback to a short ID if not found
  const userName =
    USER_MAP[learner.user_id] || `User ${shortId(learner.user_id)}`;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-900 transition">
      <div className="flex items-center gap-3 min-w-0">
        {/* Use the first letter of the mapped name for the avatar */}
        <div
          className={`w-10 h-10 rounded-full bg-linear-to-br ${
            AVATAR_COLORS[
              Math.abs(learner.user_id?.charCodeAt(0) ?? 0) %
                AVATAR_COLORS.length
            ]
          } flex items-center justify-center text-white font-bold shadow-sm`}
        >
          {userName.charAt(0)}
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold truncate text-slate-100">
            {userName}
            <span className="text-xs text-slate-500 font-normal ml-2">
              • {learner.programTitle}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
            <div className={`font-mono ${progressColor(pct)}`}>{pct}%</div>
            <div className="text-slate-600">|</div>
            <div>
              streak:{" "}
              <span className="text-slate-300">
                {learner.streak_days ?? 0}d
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-28">
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              style={{ width: `${pct}%` }}
              className={`h-full ${pct >= 100 ? "bg-emerald-400" : "bg-violet-400"}`}
            ></div>
          </div>
        </div>
        <div className="text-xs text-slate-400">
          {learner.is_at_risk ? (
            <span className="text-rose-400">At risk</span>
          ) : (
            <span className="text-slate-400">OK</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default LearnerRow;
