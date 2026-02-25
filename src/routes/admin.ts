import { Router, Request, Response } from "express";
import { and, gt, lt, sql, eq } from "drizzle-orm";
import { db } from "../db";
import {
  enrollments,
  lessonCompletions,
  modules,
  programs,
} from "../db/schema";
import { param } from "../lib/params";
import {
  checkDuplicateCompletions,
  checkInconsistentProgress,
  checkOrphanedCompletions,
  checkProgressOutOfBounds,
} from "../services/dataQuality";

const router = Router();

// ----------------------------------------------------------------
// GET /admin/programs/:programId/at-risk-learners
// ----------------------------------------------------------------
router.get(
  "/programs/:programId/at-risk-learners",
  async (req: Request, res: Response) => {
    let { programId } = req.params;
    programId = param(programId);
    // Verify the program exists
    const program = await db.query.programs.findFirst({
      where: eq(programs.id, programId),
    });
    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    // Pull all at-risk enrollments for this program
    const atRiskEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.programId, programId),
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
  const [bounds, orphaned, duplicates, inconsistent, total] = await Promise.all(
    [
      checkProgressOutOfBounds(),
      checkOrphanedCompletions(),
      checkDuplicateCompletions(),
      checkInconsistentProgress(),
      db.select({ count: sql<number>`count(*)` }).from(enrollments),
    ],
  );

  const details = [
    ...orphaned.map((r) => ({
      type: "orphaned_completions",
      lesson_id: r.lesson_id,
      count: Number(r.count),
    })),
    ...duplicates.map((r) => ({
      type: "duplicate_completions",
      enrollment_id: r.enrollment_id,
      lesson_id: r.lesson_id,
      count: Number(r.count),
    })),
    ...inconsistent.map((r) => ({ type: "inconsistent_progress", ...r })),
  ];

  return res.json({
    total_enrollments_checked: Number(total[0].count),
    anomalies: {
      progress_over_100: bounds.over100.map((e) => e.id),
      progress_under_0: bounds.under0.map((e) => e.id),
      orphaned_completions: orphaned.length,
      duplicate_completions: duplicates.length,
      inconsistent_progress: inconsistent.length,
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
