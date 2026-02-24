function calculateProgress(
  modules: { total: number; completed: number }[],
): number {
  if (modules.length === 0) return 0;

  const moduleProgresses = modules.map(({ total, completed }) => {
    if (total === 0) return 100; // empty module counts as complete
    return Math.min(100, Math.max(0, (completed / total) * 100));
  });

  const avg =
    moduleProgresses.reduce((a, b) => a + b, 0) / moduleProgresses.length;
  return Math.round(avg);
}

describe("Progress Calculation", () => {
  describe("basic formula", () => {
    it("returns 0 when nothing is completed", () => {
      expect(
        calculateProgress([
          { total: 5, completed: 0 },
          { total: 3, completed: 0 },
        ]),
      ).toBe(0);
    });

    it("returns 100 when everything is completed", () => {
      expect(
        calculateProgress([
          { total: 5, completed: 5 },
          { total: 3, completed: 3 },
        ]),
      ).toBe(100);
    });

    it("matches the spec example: Module 1 = 3/5 (60%), Module 2 = 2/4 (50%) → 55%", () => {
      expect(
        calculateProgress([
          { total: 5, completed: 3 },
          { total: 4, completed: 2 },
        ]),
      ).toBe(55);
    });
  });

  describe("averaging by module — not by total lessons", () => {
    it("weights each module equally regardless of size", () => {
      // If you naively calculated total: 1/10 = 10%
      // Correct module average: (100% + 0%) / 2 = 50%
      expect(
        calculateProgress([
          { total: 1, completed: 1 }, // 100%
          { total: 9, completed: 0 }, // 0%
        ]),
      ).toBe(50);
    });

    it("is meaningfully different from raw lesson percentage", () => {
      const byModule = calculateProgress([
        { total: 1, completed: 1 },
        { total: 9, completed: 0 },
      ]);
      const byLessonsRaw = Math.round((1 / 10) * 100); // naive = 10%
      expect(byModule).toBe(50);
      expect(byModule).not.toBe(byLessonsRaw);
    });
  });

  describe("boundary conditions", () => {
    it("never exceeds 100 even if completed > total somehow", () => {
      expect(
        calculateProgress([{ total: 2, completed: 5 }]),
      ).toBeLessThanOrEqual(100);
    });

    it("never goes below 0", () => {
      expect(
        calculateProgress([{ total: 5, completed: 0 }]),
      ).toBeGreaterThanOrEqual(0);
    });

    it("treats an empty module as 100% complete", () => {
      expect(
        calculateProgress([
          { total: 0, completed: 0 }, // → 100%
          { total: 4, completed: 0 }, // → 0%
        ]),
      ).toBe(50);
    });

    it("returns 0 when program has no modules", () => {
      expect(calculateProgress([])).toBe(0);
    });
  });

  describe("rounding", () => {
    it("rounds 33.3 down to 33", () => {
      // (100 + 0 + 0) / 3 = 33.33
      expect(
        calculateProgress([
          { total: 1, completed: 1 },
          { total: 1, completed: 0 },
          { total: 1, completed: 0 },
        ]),
      ).toBe(33);
    });

    it("rounds 66.6 up to 67", () => {
      // (100 + 100 + 0) / 3 = 66.66
      expect(
        calculateProgress([
          { total: 1, completed: 1 },
          { total: 1, completed: 1 },
          { total: 1, completed: 0 },
        ]),
      ).toBe(67);
    });
  });

  describe("partial module progress", () => {
    it("calculates 1/4 = 25%", () => {
      expect(calculateProgress([{ total: 4, completed: 1 }])).toBe(25);
    });

    it("calculates 3/4 = 75%", () => {
      expect(calculateProgress([{ total: 4, completed: 3 }])).toBe(75);
    });

    it("averages correctly across three partial modules", () => {
      // (50 + 75 + 33.3) / 3 = 52.7 → 53
      expect(
        calculateProgress([
          { total: 4, completed: 2 }, // 50%
          { total: 4, completed: 3 }, // 75%
          { total: 3, completed: 1 }, // 33%
        ]),
      ).toBe(53);
    });
  });
});
