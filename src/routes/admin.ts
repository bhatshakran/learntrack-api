import { Router, Request, Response } from "express";
import { and, gt, lt, sql, eq } from "drizzle-orm";
import { db } from "../db";
import {
  enrollments,
  lessonCompletions,
  modules,
  programs,
} from "../db/schema";

const router = Router();

// ----------------------------------------------------------------
// GET /admin/programs/:programId/at-risk-learners
// ----------------------------------------------------------------
router.get(
  "/programs/:programId/at-risk-learners",
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    // Verify the program exists
    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId as string),
    });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    // Pull all at-risk enrollments for this program
    const atRiskEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.programId, programId as string),
        eq(enrollments.isAtRisk, true),
      ),
    });

    const now = new Date();

    const response = atRiskEnrollments.map((enrollment) => {
      const daysUntilDeadline = enrollment.expectedCompletionDate
        ? Math.ceil(
            (enrollment.expectedCompletionDate.getTime() - now.getTime()) /
              86400000,
          )
        : null;

      // A readable list of why they're at risk
      const riskFactors: string[] = [];
      if ((enrollment.overallProgressPercent ?? 0) < 50)
        riskFactors.push("low progress");
      if ((enrollment.currentStreakDays ?? 0) === 0)
        riskFactors.push("broken streak");
      if (daysUntilDeadline !== null && daysUntilDeadline <= 14)
        riskFactors.push("approaching deadline");

      return {
        enrollment_id: enrollment.id,
        user_id: enrollment.userId,
        progress_percent: enrollment.overallProgressPercent,
        streak_days: enrollment.currentStreakDays,
        days_until_deadline: daysUntilDeadline,
        risk_factors: riskFactors,
      };
    });

    return res.json({ at_risk_learners: response });
  },
);

// ----------------------------------------------------------------
// GET /admin/programs/:programId/learners
// Overview of every learner in a program — useful for instructors
// ----------------------------------------------------------------
router.get(
  "/programs/:programId/learners",
  async (req: Request, res: Response) => {
    const { programId } = req.params;

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId as string),
    });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    const allEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.programId, programId as string),
    });

    const now = new Date();

    const learners = allEnrollments.map((enrollment) => {
      const daysSinceEnrollment = enrollment.enrolledAt
        ? Math.floor(
            (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000,
          )
        : 0;

      const totalDays = program.durationWeeks * 7;
      const expectedProgress =
        totalDays > 0
          ? Math.min(100, Math.round((daysSinceEnrollment / totalDays) * 100))
          : 0;

      const actualProgress = enrollment.overallProgressPercent ?? 0;
      const isBehindSchedule = actualProgress < expectedProgress - 20;

      return {
        enrollment_id: enrollment.id,
        user_id: enrollment.userId,
        progress_percent: actualProgress,
        expected_progress_percent: expectedProgress,
        is_behind_schedule: isBehindSchedule,
        streak_days: enrollment.currentStreakDays,
        last_lesson_completed_at: enrollment.lastLessonCompletedAt,
        is_at_risk: enrollment.isAtRisk,
      };
    });

    return res.json({ program_id: programId, learners });
  },
);

// ----------------------------------------------------------------
// GET /admin/data-quality/report
// Detects all 5 anomaly types from the spec
// ----------------------------------------------------------------
router.get("/data-quality/report", async (req: Request, res: Response) => {
  const details: object[] = [];

  // --- 1. Progress > 100% ---
  const progressOver100 = await db
    .select({
      id: enrollments.id,
      progress: enrollments.overallProgressPercent,
    })
    .from(enrollments)
    .where(gt(enrollments.overallProgressPercent, 100));

  progressOver100.forEach((e) =>
    details.push({
      type: "progress_over_100",
      enrollment_id: e.id,
      progress: e.progress,
    }),
  );

  // --- 2. Progress < 0% ---
  const progressUnder0 = await db
    .select({
      id: enrollments.id,
      progress: enrollments.overallProgressPercent,
    })
    .from(enrollments)
    .where(lt(enrollments.overallProgressPercent, 0));

  progressUnder0.forEach((e) =>
    details.push({
      type: "progress_under_0",
      enrollment_id: e.id,
      progress: e.progress,
    }),
  );

  // --- 3. Orphaned completions ---
  // LessonCompletion records pointing to a lesson_id that no longer exists
  const orphanedCompletions = await db.execute(sql`
    SELECT lc.lesson_id, COUNT(*) as count
    FROM lesson_completions lc
    LEFT JOIN lessons l ON lc.lesson_id = l.id
    WHERE l.id IS NULL
    GROUP BY lc.lesson_id
  `);

  orphanedCompletions.rows.forEach((row: any) =>
    details.push({
      type: "orphaned_completion",
      lesson_id: row.lesson_id,
      count: Number(row.count),
    }),
  );

  // --- 4. Duplicate completions ---
  // Same (enrollment_id, lesson_id) appears more than once
  // This should never happen due to the unique constraint, but
  // catches cases where the constraint was added after bad data crept in
  const duplicateCompletions = await db.execute(sql`
    SELECT enrollment_id, lesson_id, COUNT(*) as count
    FROM lesson_completions
    GROUP BY enrollment_id, lesson_id
    HAVING COUNT(*) > 1
  `);

  duplicateCompletions.rows.forEach((row: any) =>
    details.push({
      type: "duplicate_completion",
      enrollment_id: row.enrollment_id,
      lesson_id: row.lesson_id,
      count: Number(row.count),
    }),
  );

  // --- 5. Inconsistent progress ---
  // Recalculate actual progress for every enrollment and compare
  // to what's stored. Flags any mismatch.
  const allEnrollments = await db.query.enrollments.findMany();
  const inconsistentProgress: object[] = [];

  for (const enrollment of allEnrollments) {
    // Get all modules for this program
    const programModules = await db.query.modules.findMany({
      where: eq(modules.programId, enrollment.programId!),
      with: { lessons: true },
    });

    // Get all completions for this enrollment
    const completions = await db
      .select()
      .from(lessonCompletions)
      .where(eq(lessonCompletions.enrollmentId, enrollment.id));

    const completedIds = new Set(completions.map((c) => c.lessonId));

    // Recalculate using the same formula as the progress service
    const moduleProgresses = programModules.map((mod) => {
      const total = mod.lessons.length;
      if (total === 0) return 100;
      const completed = mod.lessons.filter((l) =>
        completedIds.has(l.id),
      ).length;
      return (completed / total) * 100;
    });

    const actualProgress =
      moduleProgresses.length === 0
        ? 0
        : Math.min(
            100,
            Math.max(
              0,
              Math.round(
                moduleProgresses.reduce((a, b) => a + b, 0) /
                  moduleProgresses.length,
              ),
            ),
          );

    const storedProgress = enrollment.overallProgressPercent ?? 0;

    if (actualProgress !== storedProgress) {
      inconsistentProgress.push({
        type: "inconsistent_progress",
        enrollment_id: enrollment.id,
        stored_progress: storedProgress,
        actual_progress: actualProgress,
        difference: storedProgress - actualProgress,
      });
    }
  }

  details.push(...inconsistentProgress);

  // --- Build final report ---
  const totalEnrollments = await db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments);

  return res.json({
    total_enrollments_checked: Number(totalEnrollments[0].count),
    anomalies: {
      progress_over_100: progressOver100.length,
      progress_under_0: progressUnder0.length,
      orphaned_completions: orphanedCompletions.rows.length,
      duplicate_completions: duplicateCompletions.rows.length,
      inconsistent_progress: inconsistentProgress.length,
    },
    details,
  });
});

// ----------------------------------------------------------------
// POST /admin/data-quality/fix-inconsistent-progress
// Repairs any enrollment where stored progress doesn't match reality
// ----------------------------------------------------------------
router.post(
  "/data-quality/fix-inconsistent-progress",
  async (req: Request, res: Response) => {
    const allEnrollments = await db.query.enrollments.findMany();
    const fixed: object[] = [];

    for (const enrollment of allEnrollments) {
      const programModules = await db.query.modules.findMany({
        where: eq(modules.programId, enrollment.programId!),
        with: { lessons: true },
      });

      const completions = await db
        .select()
        .from(lessonCompletions)
        .where(eq(lessonCompletions.enrollmentId, enrollment.id));

      const completedIds = new Set(completions.map((c) => c.lessonId));

      const moduleProgresses = programModules.map((mod) => {
        const total = mod.lessons.length;
        if (total === 0) return 100;
        const completed = mod.lessons.filter((l) =>
          completedIds.has(l.id),
        ).length;
        return (completed / total) * 100;
      });

      const actualProgress =
        moduleProgresses.length === 0
          ? 0
          : Math.min(
              100,
              Math.max(
                0,
                Math.round(
                  moduleProgresses.reduce((a, b) => a + b, 0) /
                    moduleProgresses.length,
                ),
              ),
            );

      const storedProgress = enrollment.overallProgressPercent ?? 0;

      if (actualProgress !== storedProgress) {
        await db
          .update(enrollments)
          .set({
            overallProgressPercent: actualProgress,
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, enrollment.id));

        fixed.push({
          enrollment_id: enrollment.id,
          old_progress: storedProgress,
          new_progress: actualProgress,
        });
      }
    }

    return res.json({
      fixed_count: fixed.length,
      fixed,
    });
  },
);

export default router;
