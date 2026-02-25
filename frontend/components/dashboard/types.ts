export type Program = {
  id: string;
  title: string;
  category?: string;
  level?: string;
  durationWeeks?: number;
  status?: string;
  modules?: {
    id: string;
    title: string;
    lessons?: { id: string; title: string }[];
  }[];
};

export type Learner = {
  enrollment_id: string;
  user_id: string;
  progress_percent?: number;
  streak_days?: number;
  is_at_risk?: boolean;
  is_behind_schedule?: boolean;
  expected_progress_percent?: number;
  programTitle?: string;
  programId?: string;
};

export type AtRiskLearner = {
  enrollment_id: string;
  user_id: string;
  progress_percent?: number;
  streak_days?: number;
  days_until_deadline?: number | null;
  risk_factors?: string[];
  programTitle?: string;
};

export type QualityReport = {
  total_enrollments_checked: number;
  anomalies: {
    progress_over_100: number;
    progress_under_0: number;
    orphaned_completions: number;
    duplicate_completions: number;
    inconsistent_progress: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Array<any>;
};
