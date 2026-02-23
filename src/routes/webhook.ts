import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  lessonCompletions,
  enrollments,
  lessons,
  modules,
  programs,
} from "../db/schema";
import { recalculateProgress } from "../services/progress";
import { calculateNewStreak } from "../services/streak";
import { computeIsAtRisk } from "../services/isAtRisk";

const router = Router();

// Validate the incoming webhook payload
const webhookSchema = z.object({
  idempotency_key: z.string().min(1),
  enrollment_id: z.uuid(),
  lesson_id: z.uuid(),
  completed_at: z.iso.datetime(),
});

router.post("/quizzes/webhook", async (req: Request, res: Response) => {
  // 1. Validate payload shape
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    // Still return 200 — we never want the quiz service to retry bad payloads forever
    return res.status(200).json({
      message: "Invalid payload, ignored",
      errors: z.treeifyError(parsed.error),
    });
  }

  const { idempotency_key, enrollment_id, lesson_id, completed_at } =
    parsed.data;

  // 2. Idempotency check — have we seen this exact event before?
  //    If yes, return 200 immediately without doing anything
  const existingByKey = await db.query.lessonCompletions.findFirst({
    where: eq(lessonCompletions.idempotencyKey, idempotency_key),
  });
  if (existingByKey) {
    return res
      .status(200)
      .json({ message: "Already processed", idempotency_key });
  }

  // 3. Verify the enrollment exists
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollment_id),
  });
  if (!enrollment) {
    // Return 200 — don't let quiz service retry for bad data we can never fix
    return res.status(200).json({ message: "Enrollment not found, ignored" });
  }

  // 4. Verify the lesson exists and belongs to the enrolled program
  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lesson_id),
    with: { module: true },
  });
  if (!lesson || lesson.module?.programId !== enrollment.programId) {
    return res
      .status(200)
      .json({ message: "Lesson does not belong to this program, ignored" });
  }

  // 5. Check if this lesson is already completed for this enrollment
  //    (different from idempotency — this catches cases where the lesson
  //    was completed manually before the webhook arrived)
  const existingCompletion = await db.query.lessonCompletions.findFirst({
    where: and(
      eq(lessonCompletions.enrollmentId, enrollment_id),
      eq(lessonCompletions.lessonId, lesson_id),
    ),
  });
  if (existingCompletion) {
    return res
      .status(200)
      .json({ message: "Lesson already completed, ignored" });
  }

  // 6. Create the completion record, storing the idempotency_key
  await db.insert(lessonCompletions).values({
    enrollmentId: enrollment_id,
    lessonId: lesson_id,
    completedAt: new Date(completed_at),
    completionSource: "AUTO_QUIZ",
    idempotencyKey: idempotency_key,
  });

  // 7. Recalculate progress
  const newProgress = await recalculateProgress(enrollment_id);

  // 8. Recalculate streak based on the completed_at time from the webhook
  //    (not necessarily now — the event may have happened earlier)
  const completedAtDate = new Date(completed_at);
  const newStreak = calculateNewStreak(
    enrollment.lastLessonCompletedAt,
    completedAtDate,
    enrollment.currentStreakDays,
  );

  // 9. Recompute at-risk flag
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

  // 10. Update the enrollment
  await db
    .update(enrollments)
    .set({
      overallProgressPercent: newProgress,
      currentStreakDays: newStreak,
      lastLessonCompletedAt: completedAtDate,
      isAtRisk,
      updatedAt: new Date(),
    })
    .where(eq(enrollments.id, enrollment_id));

  return res.status(200).json({ message: "Processed successfully" });
});

export default router;
