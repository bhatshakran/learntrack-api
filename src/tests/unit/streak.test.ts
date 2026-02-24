type StreakState = {
  currentStreakDays: number;
  lastLessonCompletedAt: Date | null;
};

function updateStreak(state: StreakState, completedAt: Date): StreakState {
  const { currentStreakDays, lastLessonCompletedAt } = state;

  if (!lastLessonCompletedAt) {
    // First ever completion
    return { currentStreakDays: 1, lastLessonCompletedAt: completedAt };
  }

  const lastDay = new Date(lastLessonCompletedAt);
  const completedDay = new Date(completedAt);

  // Compare calendar days (UTC)
  lastDay.setUTCHours(0, 0, 0, 0);
  completedDay.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (completedDay.getTime() - lastDay.getTime()) / 86400000,
  );

  if (diffDays === 0) {
    // Same day — streak unchanged
    return { currentStreakDays, lastLessonCompletedAt };
  }

  if (diffDays === 1) {
    // Consecutive day — increment
    return {
      currentStreakDays: currentStreakDays + 1,
      lastLessonCompletedAt: completedAt,
    };
  }

  // Gap of 2+ days — reset
  return { currentStreakDays: 1, lastLessonCompletedAt: completedAt };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const day = (iso: string) => new Date(iso);
const noHistory: StreakState = {
  currentStreakDays: 0,
  lastLessonCompletedAt: null,
};
const withStreak = (days: number, lastAt: string): StreakState => ({
  currentStreakDays: days,
  lastLessonCompletedAt: new Date(lastAt),
});

// ── Tests ──────────────────────────────────────────────────────────────────
describe("Streak Calculation", () => {
  describe("first completion", () => {
    it("sets streak to 1 on first ever completion", () => {
      const result = updateStreak(noHistory, day("2026-01-10T10:00:00Z"));
      expect(result.currentStreakDays).toBe(1);
    });

    it("records the completion date", () => {
      const completedAt = day("2026-01-10T10:00:00Z");
      const result = updateStreak(noHistory, completedAt);
      expect(result.lastLessonCompletedAt).toEqual(completedAt);
    });
  });

  describe("same day completion", () => {
    it("does not change streak when completing on the same day (morning)", () => {
      const state = withStreak(3, "2026-01-10T08:00:00Z");
      const result = updateStreak(state, day("2026-01-10T10:00:00Z"));
      expect(result.currentStreakDays).toBe(3);
    });

    it("does not change streak when completing on the same day (evening)", () => {
      const state = withStreak(5, "2026-01-10T07:00:00Z");
      const result = updateStreak(state, day("2026-01-10T23:59:59Z"));
      expect(result.currentStreakDays).toBe(5);
    });
  });

  describe("consecutive day", () => {
    it("increments streak by 1 on the next calendar day", () => {
      const state = withStreak(3, "2026-01-10T20:00:00Z");
      const result = updateStreak(state, day("2026-01-11T09:00:00Z"));
      expect(result.currentStreakDays).toBe(4);
    });

    it("correctly bridges midnight — late night to next morning", () => {
      const state = withStreak(1, "2026-01-10T23:55:00Z");
      const result = updateStreak(state, day("2026-01-11T00:05:00Z"));
      expect(result.currentStreakDays).toBe(2);
    });
  });

  describe("streak reset", () => {
    it("resets to 1 after a 2-day gap", () => {
      const state = withStreak(7, "2026-01-10T10:00:00Z");
      const result = updateStreak(state, day("2026-01-12T10:00:00Z"));
      expect(result.currentStreakDays).toBe(1);
    });

    it("resets to 1 after a week-long gap", () => {
      const state = withStreak(14, "2026-01-01T10:00:00Z");
      const result = updateStreak(state, day("2026-01-08T10:00:00Z"));
      expect(result.currentStreakDays).toBe(1);
    });

    it("does NOT reset to 0 — a new completion always starts at 1", () => {
      const state = withStreak(10, "2026-01-01T10:00:00Z");
      const result = updateStreak(state, day("2026-01-20T10:00:00Z"));
      expect(result.currentStreakDays).toBe(1);
      expect(result.currentStreakDays).not.toBe(0);
    });
  });

  describe("streak building over multiple days", () => {
    it("builds correctly over 5 consecutive days", () => {
      const days = [
        "2026-01-06T10:00:00Z",
        "2026-01-07T10:00:00Z",
        "2026-01-08T10:00:00Z",
        "2026-01-09T10:00:00Z",
        "2026-01-10T10:00:00Z",
      ];

      let state = noHistory;
      for (const d of days) {
        state = updateStreak(state, new Date(d));
      }
      expect(state.currentStreakDays).toBe(5);
    });

    it("breaks and restarts correctly in a sequence", () => {
      // Day 1, 2 → gap → Day 5 → Day 6
      let state = noHistory;
      state = updateStreak(state, day("2026-01-01T10:00:00Z")); // streak: 1
      state = updateStreak(state, day("2026-01-02T10:00:00Z")); // streak: 2
      state = updateStreak(state, day("2026-01-05T10:00:00Z")); // reset:  1
      state = updateStreak(state, day("2026-01-06T10:00:00Z")); // streak: 2

      expect(state.currentStreakDays).toBe(2);
    });
  });

  describe("timezone edge cases", () => {
    it("treats completions as UTC calendar days", () => {
      // 23:00 UTC day 1 and 01:00 UTC day 2 are consecutive days
      const state = withStreak(1, "2026-01-10T23:00:00Z");
      const result = updateStreak(state, day("2026-01-11T01:00:00Z"));
      expect(result.currentStreakDays).toBe(2);
    });
  });
});
