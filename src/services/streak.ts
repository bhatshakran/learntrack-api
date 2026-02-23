export function calculateNewStreak(
  lastCompletedAt: Date | null,
  now: Date,
  currentStreak: number,
): number {
  if (!lastCompletedAt) return 1; // First ever completion

  const lastDate = new Date(lastCompletedAt);
  lastDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (today.getTime() - lastDate.getTime()) / 86400000,
  );

  if (diffDays === 0) return currentStreak; // Same day, no change
  if (diffDays === 1) return currentStreak + 1; // Consecutive day
  return 1; // Gap — streak resets to 1
}
