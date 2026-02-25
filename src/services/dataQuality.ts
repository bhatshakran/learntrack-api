import { gt, lt, or, sql } from "drizzle-orm";
import { db } from "../db";
import { enrollments } from "../db/schema";

// One query instead of two — splits results by condition after
export async function checkProgressOutOfBounds() {
  const rows = await db
    .select({
      id: enrollments.id,
      progress: enrollments.overallProgressPercent,
    })
    .from(enrollments)
    .where(
      or(
        gt(enrollments.overallProgressPercent, 100),
        lt(enrollments.overallProgressPercent, 0),
      ),
    );

  return {
    over100: rows.filter((e) => (e.progress ?? 0) > 100),
    under0: rows.filter((e) => (e.progress ?? 0) < 0),
  };
}

export async function checkOrphanedCompletions() {
  const rows = await db.execute(sql`
      SELECT lc.lesson_id, COUNT(*) as count
      FROM lesson_completions lc
      LEFT JOIN lessons l ON lc.lesson_id = l.id
      WHERE l.id IS NULL
      GROUP BY lc.lesson_id
    `);
  return rows.rows as { lesson_id: string; count: number }[];
}

export async function checkDuplicateCompletions() {
  const rows = await db.execute(sql`
      SELECT enrollment_id, lesson_id, COUNT(*) as count
      FROM lesson_completions
      GROUP BY enrollment_id, lesson_id
      HAVING COUNT(*) > 1
    `);
  return rows.rows as {
    enrollment_id: string;
    lesson_id: string;
    count: number;
  }[];
}

// export async function checkInconsistentProgress() {
//   const allEnrollments = await db.query.enrollments.findMany();
//   const mismatches = [];

//   for (const enrollment of allEnrollments) {
//     const actualProgress = await recalculateProgress(enrollment.id);
//     const storedProgress = enrollment.overallProgressPercent ?? 0;

//     if (actualProgress !== storedProgress) {
//       mismatches.push({
//         enrollment_id: enrollment.id,
//         stored_progress: storedProgress,
//         actual_progress: actualProgress,
//         difference: storedProgress - actualProgress,
//       });
//     }
//   }

//   return mismatches;
// }

// Single SQL query instead of N+1 loop — computes actual progress for every
// enrollment at once using the same averaging formula as the progress service
export async function checkInconsistentProgress() {
  const rows = await db.execute(sql`
      WITH module_progress AS (
        SELECT
          e.id                          AS enrollment_id,
          e.overall_progress_percent    AS stored_progress,
          m.id                          AS module_id,
          COUNT(l.id)                   AS total_lessons,
          COUNT(lc.lesson_id)           AS completed_lessons
        FROM enrollments e
        JOIN modules m ON m.program_id = e.program_id
        LEFT JOIN lessons l ON l.module_id = m.id
        LEFT JOIN lesson_completions lc
          ON lc.enrollment_id = e.id AND lc.lesson_id = l.id
        GROUP BY e.id, e.overall_progress_percent, m.id
      ),
      enrollment_progress AS (
        SELECT
          enrollment_id,
          stored_progress,
          ROUND(AVG(
            CASE WHEN total_lessons = 0 THEN 100
                 ELSE (completed_lessons::float / total_lessons) * 100
            END
          )) AS actual_progress
        FROM module_progress
        GROUP BY enrollment_id, stored_progress
      )
      SELECT
        enrollment_id,
        stored_progress,
        actual_progress,
        stored_progress - actual_progress AS difference
      FROM enrollment_progress
      WHERE stored_progress != actual_progress
    `);

  return rows.rows as {
    enrollment_id: string;
    stored_progress: number;
    actual_progress: number;
    difference: number;
  }[];
}
