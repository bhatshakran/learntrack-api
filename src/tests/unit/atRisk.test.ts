type EnrollmentState = {
  enrolledAt: Date;
  overallProgressPercent: number;
  currentStreakDays: number;
  expectedCompletionDate: Date;
};

function isAtRisk(enrollment: EnrollmentState): boolean {
  const now = new Date();
  const daysSinceEnrollment = Math.floor(
    (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000,
  );
  const daysUntilDeadline = Math.ceil(
    (enrollment.expectedCompletionDate.getTime() - now.getTime()) / 86400000,
  );

  return (
    daysSinceEnrollment > 7 &&
    enrollment.overallProgressPercent < 50 &&
    enrollment.currentStreakDays === 0 &&
    daysUntilDeadline <= 14
  );
}

function getRiskFactors(enrollment: EnrollmentState): string[] {
  const now = new Date();
  const daysSinceEnrollment = Math.floor(
    (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000,
  );
  const daysUntilDeadline = Math.ceil(
    (enrollment.expectedCompletionDate.getTime() - now.getTime()) / 86400000,
  );

  const factors: string[] = [];
  if (enrollment.overallProgressPercent < 50) factors.push("low progress");
  if (enrollment.currentStreakDays === 0) factors.push("broken streak");
  if (daysUntilDeadline <= 14) factors.push("approaching deadline");
  return factors;
}

function isBehindSchedule(
  enrollment: EnrollmentState & { durationWeeks: number },
): boolean {
  const now = new Date();
  const daysSinceEnrollment = Math.floor(
    (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000,
  );
  const totalDays = enrollment.durationWeeks * 7;
  const expectedProgress = (daysSinceEnrollment / totalDays) * 100;
  return enrollment.overallProgressPercent < expectedProgress - 20;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

const atRiskEnrollment: EnrollmentState = {
  enrolledAt: daysAgo(15),
  overallProgressPercent: 10,
  currentStreakDays: 0,
  expectedCompletionDate: daysFromNow(10),
};

// ── Tests ──────────────────────────────────────────────────────────────────
describe("At-Risk Detection", () => {
  describe("all four criteria must be true", () => {
    it("flags a learner when all 4 criteria are met", () => {
      expect(isAtRisk(atRiskEnrollment)).toBe(true);
    });

    it("does NOT flag if enrolled ≤ 7 days ago", () => {
      expect(isAtRisk({ ...atRiskEnrollment, enrolledAt: daysAgo(5) })).toBe(
        false,
      );
    });

    it("does NOT flag if progress ≥ 50%", () => {
      expect(
        isAtRisk({ ...atRiskEnrollment, overallProgressPercent: 50 }),
      ).toBe(false);
    });

    it("does NOT flag if streak > 0", () => {
      expect(isAtRisk({ ...atRiskEnrollment, currentStreakDays: 1 })).toBe(
        false,
      );
    });

    it("does NOT flag if deadline is more than 14 days away", () => {
      expect(
        isAtRisk({
          ...atRiskEnrollment,
          expectedCompletionDate: daysFromNow(15),
        }),
      ).toBe(false);
    });
  });

  describe("threshold boundaries", () => {
    it("flags at exactly 8 days since enrollment (> 7)", () => {
      expect(isAtRisk({ ...atRiskEnrollment, enrolledAt: daysAgo(8) })).toBe(
        true,
      );
    });

    it("does NOT flag at exactly 7 days since enrollment (not > 7)", () => {
      expect(isAtRisk({ ...atRiskEnrollment, enrolledAt: daysAgo(7) })).toBe(
        false,
      );
    });

    it("flags at 49% progress (< 50)", () => {
      expect(
        isAtRisk({ ...atRiskEnrollment, overallProgressPercent: 49 }),
      ).toBe(true);
    });

    it("does NOT flag at exactly 50% progress", () => {
      expect(
        isAtRisk({ ...atRiskEnrollment, overallProgressPercent: 50 }),
      ).toBe(false);
    });

    it("flags with deadline exactly 14 days away (≤ 14)", () => {
      expect(
        isAtRisk({
          ...atRiskEnrollment,
          expectedCompletionDate: daysFromNow(14),
        }),
      ).toBe(true);
    });

    it("does NOT flag with deadline 15 days away", () => {
      expect(
        isAtRisk({
          ...atRiskEnrollment,
          expectedCompletionDate: daysFromNow(15),
        }),
      ).toBe(false);
    });
  });

  describe("real-world scenarios", () => {
    it("does NOT flag a high-progress learner with an active streak", () => {
      expect(
        isAtRisk({
          enrolledAt: daysAgo(20),
          overallProgressPercent: 75,
          currentStreakDays: 5,
          expectedCompletionDate: daysFromNow(10),
        }),
      ).toBe(false);
    });

    it("does NOT flag a new learner who just enrolled", () => {
      expect(
        isAtRisk({
          enrolledAt: daysAgo(2),
          overallProgressPercent: 0,
          currentStreakDays: 0,
          expectedCompletionDate: daysFromNow(5), // tight deadline but new
        }),
      ).toBe(false);
    });

    it("flags a learner who was on track but stopped", () => {
      expect(
        isAtRisk({
          enrolledAt: daysAgo(25),
          overallProgressPercent: 30, // fell behind
          currentStreakDays: 0, // stopped
          expectedCompletionDate: daysFromNow(7),
        }),
      ).toBe(true);
    });
  });

  describe("risk factors", () => {
    it("returns all 3 factors for a fully at-risk learner", () => {
      const factors = getRiskFactors(atRiskEnrollment);
      expect(factors).toContain("low progress");
      expect(factors).toContain("broken streak");
      expect(factors).toContain("approaching deadline");
    });

    it("only returns applicable factors", () => {
      const factors = getRiskFactors({
        ...atRiskEnrollment,
        currentStreakDays: 3, // not broken
        expectedCompletionDate: daysFromNow(30), // not approaching
      });
      expect(factors).toContain("low progress");
      expect(factors).not.toContain("broken streak");
      expect(factors).not.toContain("approaching deadline");
    });
  });

  describe("pacing / behind schedule", () => {
    it("flags a learner who is 30 points behind expected pace", () => {
      // Enrolled 14 days ago, 4-week (28 day) course
      // Expected: (14/28) * 100 = 50%
      // Actual: 20% → 30 points behind → flagged
      const result = isBehindSchedule({
        enrolledAt: daysAgo(14),
        overallProgressPercent: 20,
        currentStreakDays: 0,
        expectedCompletionDate: daysFromNow(14),
        durationWeeks: 4,
      });
      expect(result).toBe(true);
    });

    it("does NOT flag a learner within 20 points of expected pace", () => {
      // Expected 50%, actual 35% → only 15 points behind → fine
      const result = isBehindSchedule({
        enrolledAt: daysAgo(14),
        overallProgressPercent: 35,
        currentStreakDays: 2,
        expectedCompletionDate: daysFromNow(14),
        durationWeeks: 4,
      });
      expect(result).toBe(false);
    });

    it("does NOT flag a learner ahead of pace", () => {
      const result = isBehindSchedule({
        enrolledAt: daysAgo(14),
        overallProgressPercent: 80,
        currentStreakDays: 10,
        expectedCompletionDate: daysFromNow(14),
        durationWeeks: 4,
      });
      expect(result).toBe(false);
    });
  });
});
