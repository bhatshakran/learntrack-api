export function computeIsAtRisk(
  enrollment: {
    enrolledAt: Date;
    overallProgressPercent: number;
    currentStreakDays: number;
    expectedCompletionDate: Date | null;
  },
  program: { durationWeeks: number },
): boolean {
  const now = new Date();
  const daysSinceEnrollment =
    (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000;

  if (daysSinceEnrollment <= 7) return false;
  if (enrollment.overallProgressPercent >= 50) return false;
  if (enrollment.currentStreakDays > 0) return false;
  if (!enrollment.expectedCompletionDate) return false;

  const daysUntilDeadline =
    (enrollment.expectedCompletionDate.getTime() - now.getTime()) / 86400000;
  return daysUntilDeadline <= 14;
}
