import { InferSelectModel } from "drizzle-orm";
import { enrollments, modules, lessons, lessonCompletions } from "../db/schema";

type Enrollment = InferSelectModel<typeof enrollments> & {
  program: {
    modules: (InferSelectModel<typeof modules> & {
      lessons: InferSelectModel<typeof lessons>[];
    })[];
  };
  lessonCompletions: InferSelectModel<typeof lessonCompletions>[];
};

export function formatEnrollmentResponse(enrollment: Enrollment) {
  const completedLessons = new Set(
    enrollment.lessonCompletions.map((c) => c.lessonId),
  );
  const completionDate = new Map(
    enrollment.lessonCompletions.map((c) => [c.lessonId, c.completedAt]),
  );

  return {
    id: enrollment.id,
    user_id: enrollment.userId,
    program_id: enrollment.programId,
    overall_progress_percent: enrollment.overallProgressPercent,
    current_streak_days: enrollment.currentStreakDays,
    last_lesson_completed_at: enrollment.lastLessonCompletedAt,
    expected_completion_date: enrollment.expectedCompletionDate,
    is_at_risk: enrollment.isAtRisk,
    modules: enrollment.program.modules.map((mod) => ({
      module_id: mod.id,
      title: mod.title,
      progress_percent:
        mod.lessons.length === 0
          ? 100
          : Math.round(
              (mod.lessons.filter((l) => completedLessons.has(l.id)).length /
                mod.lessons.length) *
                100,
            ),
      lessons: mod.lessons.map((l) => ({
        lesson_id: l.id,
        title: l.title,
        completed: completedLessons.has(l.id),
        completed_at: completionDate.get(l.id) ?? null,
      })),
    })),
  };
}
