export type LeaderboardEntry = {
  rank: number;
  enrollment_id: string;
  user_id: string;
  program_id: string;
  progress_percent: number;
  current_streak_days: number;
  last_lesson_completed_at: string | null;
};

export type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  total: number;
  filters: { program_id: string | null; limit: number };
};

export const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export const RANK_COLORS: Record<
  number,
  { bar: string; glow: string; text: string }
> = {
  1: {
    bar: "from-yellow-400 to-amber-500",
    glow: "shadow-yellow-500/20",
    text: "text-yellow-400",
  },
  2: {
    bar: "from-slate-300 to-slate-400",
    glow: "shadow-slate-400/20",
    text: "text-slate-300",
  },
  3: {
    bar: "from-orange-400 to-amber-600",
    glow: "shadow-orange-500/20",
    text: "text-orange-400",
  },
};
