import { Router, Request, Response } from "express";
import { and, sql, eq, desc } from "drizzle-orm";
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
import { recalculateProgress } from "../services/progress";

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
    // 1. Delete orphaned completions first
    const orphaned = await db.execute(sql`
    DELETE FROM lesson_completions
    WHERE lesson_id NOT IN (SELECT id FROM lessons)
    RETURNING enrollment_id, lesson_id
  `);

    // 2. Fix inconsistent progress (same as before)
    const allEnrollments = await db.query.enrollments.findMany();
    const fixed: object[] = [];

    for (const enrollment of allEnrollments) {
      const actualProgress = await recalculateProgress(enrollment.id);
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
      orphaned_completions_deleted: orphaned.rows.length,
      fixed_count: fixed.length,
      fixed,
    });
  },
);
// ----------------------------------------------------------------
// GET /admin/leaderboard?programId=...&limit=10
// Fetches the leaderboard
// ----------------------------------------------------------------
router.get("/leaderboard", async (req: Request, res: Response) => {
  const { programId, limit = "10" } = req.query;

  const top = await db
    .select({
      enrollment_id: enrollments.id,
      user_id: enrollments.userId,
      program_id: enrollments.programId,
      progress_percent: enrollments.overallProgressPercent,
      current_streak_days: enrollments.currentStreakDays,
      last_lesson_completed_at: enrollments.lastLessonCompletedAt,
    })
    .from(enrollments)
    .where(
      programId ? eq(enrollments.programId, programId as string) : undefined,
    )
    .orderBy(
      desc(enrollments.overallProgressPercent),
      desc(enrollments.currentStreakDays), // tiebreak by streak
    )
    .limit(Math.min(Number(limit), 100)); // cap at 100

  return res.json({
    leaderboard: top.map((e, i) => ({
      rank: i + 1,
      enrollment_id: e.enrollment_id,
      user_id: e.user_id,
      program_id: e.program_id,
      progress_percent: e.progress_percent ?? 0,
      current_streak_days: e.current_streak_days,
      last_lesson_completed_at: e.last_lesson_completed_at,
    })),
    total: top.length,
    filters: {
      program_id: programId ?? null,
      limit: Number(limit),
    },
  });
});

export default router;
