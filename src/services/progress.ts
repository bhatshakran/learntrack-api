import { db } from "../db";
import { modules, lessonCompletions, enrollments } from "../db/schema";
import { eq } from "drizzle-orm";

export async function recalculateProgress(enrollmentId: string) {
  // 1. Get the enrollment to find the programId
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
  });
  if (!enrollment) throw new Error("Enrollment not found");

  // 2. Get all modules in the program
  const programModules = await db.query.modules.findMany({
    where: eq(modules.programId, enrollment.programId!),
    with: { lessons: true },
  });

  // 3. Get all completed lessons for this enrollment
  const completions = await db
    .select()
    .from(lessonCompletions)
    .where(eq(lessonCompletions.enrollmentId, enrollmentId));
  const completedLessonIds = new Set(completions.map((c) => c.lessonId));

  // 4. Calculate per-module progress then average
  const moduleProgresses = programModules.map((mod) => {
    const total = mod.lessons.length;
    if (total === 0) return 100; // empty module = 100%
    const completed = mod.lessons.filter((l) =>
      completedLessonIds.has(l.id),
    ).length;
    return (completed / total) * 100;
  });

  const overallProgress =
    moduleProgresses.length === 0
      ? 0
      : Math.round(
          moduleProgresses.reduce((a, b) => a + b, 0) / moduleProgresses.length,
        );

  // Clamp between 0-100
  return Math.min(100, Math.max(0, overallProgress));
}
