import { Request, Response, Router } from "express";
import { db } from "../db";
import {
  lessonCompletions,
  enrollments,
  lessons,
  programs,
  modules,
} from "../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { recalculateProgress } from "../services/progress";
import { calculateNewStreak } from "../services/streak";
import { computeIsAtRisk } from "../services/isAtRisk";
import { param } from "../lib/params";
import { formatEnrollmentResponse } from "../services/enrollment";

const router = Router();

router.post(
  "/:enrollmentId/lessons/:lessonId/complete",
  async (req: Request, res: Response) => {
    let { enrollmentId, lessonId } = req.params;
    enrollmentId = param(enrollmentId);
    lessonId = param(lessonId);
    // 1. Verify enrollment
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, param(enrollmentId)),
    });
    if (!enrollment)
      return res.status(404).json({ error: "Enrollment not found" });

    // 2. Verify lesson belongs to the program
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, param(lessonId)),
      with: { module: true },
    });
    if (!lesson || lesson.module?.programId !== enrollment.programId)
      return res
        .status(400)
        .json({ error: "Lesson does not belong to this program" });

    // 3. Check for duplicate
    const existing = await db.query.lessonCompletions.findFirst({
      where: and(
        eq(lessonCompletions.enrollmentId, enrollmentId),
        eq(lessonCompletions.lessonId, lessonId),
      ),
    });
    if (existing)
      return res.status(200).json({ message: "Already completed", enrollment });

    // 4. Create completion record
    await db.insert(lessonCompletions).values({
      enrollmentId,
      lessonId,
      completionSource: "MANUAL",
      idempotencyKey: `manual-${enrollmentId}-${lessonId}`,
    });

    // 5. Recalculate progress
    const newProgress = await recalculateProgress(enrollmentId);
    const now = new Date();
    const newStreak = calculateNewStreak(
      enrollment.lastLessonCompletedAt,
      now,
      enrollment.currentStreakDays!,
    );

    // 6. Fetch program for at-risk check
    const program = await db.query.programs.findFirst({
      where: eq(programs.id, enrollment.programId!),
    });
    const isAtRisk = computeIsAtRisk(
      {
        ...enrollment,
        overallProgressPercent: newProgress,
        currentStreakDays: newStreak,
      },
      program!,
    );

    // 7. Update enrollment
    const [updated] = await db
      .update(enrollments)
      .set({
        overallProgressPercent: newProgress,
        currentStreakDays: newStreak,
        lastLessonCompletedAt: now,
        isAtRisk,
        updatedAt: now,
      })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    res.json(updated);
  },
);

router.get("/:enrollmentId", async (req: Request, res: Response) => {
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, param(req.params.enrollmentId)),
    with: {
      program: {
        with: {
          modules: {
            orderBy: [asc(modules.sequenceOrder)],
            with: { lessons: true },
          },
        },
      },
      lessonCompletions: true,
    },
  });

  if (!enrollment)
    return res.status(404).json({ error: "Enrollment not found" });

  return res.json(formatEnrollmentResponse(enrollment));
});

export default router;
