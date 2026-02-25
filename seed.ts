/**
 * 🕵️‍♂️ DATA ANOMALY MAP
 * -------------------------------------------------------------------------
 * This script intentionally injects the following "bugs" for the
 * Data Quality Dashboard to detect:
 * * 1. Progress Over 100%: Bob (Data Sci) is set to 130%.
 * 2. Progress Under 0%:   Carol (Business) is set to -5%.
 * 3. Inconsistent:       Dave (Web Dev) has 40% stored but 0 actual completions.
 * 4. Duplicate:           Bob (Web Dev) has the same Lesson inserted twice.
 * 5. Orphaned:            Alice (Web Dev) has a completion for a non-existent Lesson ID.
 * -------------------------------------------------------------------------
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./src/db/schema";
import * as dotenv from "dotenv";
import { InferInsertModel, sql } from "drizzle-orm";

dotenv.config();

const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), {
  schema,
});

// --- VALID HEXADECIMAL UUIDS ---
// Pattern-based for easy debugging:
// Users: aaaaaaaa..., Programs: bbbbbbbb..., Modules: cccccccc...
const ID = {
  users: {
    alice: "aaaaaaaa-1111-4111-a111-111111111111",
    bob: "aaaaaaaa-2222-4222-a222-222222222222",
    carol: "aaaaaaaa-3333-4333-a333-333333333333",
    dave: "aaaaaaaa-4444-4444-a444-444444444444",
  },
  programs: {
    webDev: "bbbbbbbb-0000-4000-b000-000000000001",
    dataSci: "bbbbbbbb-0000-4000-b000-000000000002",
    business: "bbbbbbbb-0000-4000-b000-000000000003",
  },
  modules: {
    htmlCss: "cccccccc-0000-4000-c000-000000000001",
    javascript: "cccccccc-0000-4000-c000-000000000002",
    react: "cccccccc-0000-4000-c000-000000000003",
    python: "cccccccc-0000-4000-c000-000000000004",
    pandas: "cccccccc-0000-4000-c000-000000000005",
    strategy: "cccccccc-0000-4000-c000-000000000006",
    marketing: "cccccccc-0000-4000-c000-000000000007",
  },
  lessons: {
    htmlIntro: "dddddddd-0000-4000-d000-000000000001",
    htmlForms: "dddddddd-0000-4000-d000-000000000002",
    cssBasics: "dddddddd-0000-4000-d000-000000000003",
    jsIntro: "dddddddd-0000-4000-d000-000000000004",
    jsFunctions: "dddddddd-0000-4000-d000-000000000005",
    reactIntro: "dddddddd-0000-4000-d000-000000000006",
    pyIntro: "dddddddd-0000-4000-d000-000000000007",
    pandasDf: "dddddddd-0000-4000-d000-000000000008",
    stratIntro: "dddddddd-0000-4000-d000-000000000009",
    mktIntro: "dddddddd-0000-4000-d000-000000000010",
  },
  enrollments: {
    aliceWebDev: "eeeeeeee-0000-4000-e000-000000000001",
    daveWebDev: "eeeeeeee-0000-4000-e000-000000000004",
    bobDataSci: "eeeeeeee-0000-4000-e000-000000000006",
    carolBusiness: "eeeeeeee-0000-4000-e000-000000000007",
  },
  orphanLessonId: "00000000-0000-4000-0000-000000000000",
};

export const USER_MAP: Record<string, string> = {
  [ID.users.alice]: "Alice Smith",
  [ID.users.bob]: "Bob Johnson",
  [ID.users.carol]: "Carol Williams",
  [ID.users.dave]: "Dave Brown",
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000);

async function seed() {
  console.log("🌱 Starting seed with deliberate data anomalies...\n");

  // 1. Disable Foreign Key checks to allow orphaned lesson completions
  await db.execute(sql`SET session_replication_role = 'replica';`);

  // Clear existing data
  await db.delete(schema.lessonCompletions);
  await db.delete(schema.enrollments);
  await db.delete(schema.lessons);
  await db.delete(schema.modules);
  await db.delete(schema.programs);

  // --- PROGRAMS ---
  await db.insert(schema.programs).values([
    {
      id: ID.programs.webDev,
      title: "Full Stack Web Development",
      category: "PROGRAMMING",
      level: "BEGINNER",
      durationWeeks: 8,
      status: "PUBLISHED",
      description: "Learn HTML, CSS, JavaScript and React.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.programs.dataSci,
      title: "Data Science with Python",
      category: "DATA_SCIENCE",
      level: "INTERMEDIATE",
      durationWeeks: 6,
      status: "PUBLISHED",
      description: "Master Python and Pandas.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.programs.business,
      title: "Business Strategy",
      category: "BUSINESS",
      level: "BEGINNER",
      durationWeeks: 4,
      status: "PUBLISHED",
      description: "Core business concepts.",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // --- MODULES ---
  await db.insert(schema.modules).values([
    {
      id: ID.modules.htmlCss,
      programId: ID.programs.webDev,
      title: "HTML & CSS",
      sequenceOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.modules.javascript,
      programId: ID.programs.webDev,
      title: "JS Fundamentals",
      sequenceOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.modules.python,
      programId: ID.programs.dataSci,
      title: "Python Basics",
      sequenceOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.modules.strategy,
      programId: ID.programs.business,
      title: "Strategy 101",
      sequenceOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // --- LESSONS ---
  await db.insert(schema.lessons).values([
    {
      id: ID.lessons.htmlIntro,
      moduleId: ID.modules.htmlCss,
      title: "Intro to HTML",
      completionType: "MANUAL",
      durationMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.lessons.jsIntro,
      moduleId: ID.modules.javascript,
      title: "Intro to JS",
      completionType: "MANUAL",
      durationMinutes: 45,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.lessons.pyIntro,
      moduleId: ID.modules.python,
      title: "Intro to Python",
      completionType: "MANUAL",
      durationMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.lessons.stratIntro,
      moduleId: ID.modules.strategy,
      title: "Business Basics",
      completionType: "MANUAL",
      durationMinutes: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // --- ENROLLMENTS ---
  type NewEnrollment = InferInsertModel<typeof schema.enrollments>;
  const enrollmentData: NewEnrollment[] = [
    {
      id: ID.enrollments.aliceWebDev,
      userId: ID.users.alice,
      programId: ID.programs.webDev,
      enrolledAt: daysAgo(30),
      expectedCompletionDate: daysFromNow(26),
      overallProgressPercent: 77,
      currentStreakDays: 5,
      isAtRisk: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.enrollments.bobDataSci,
      userId: ID.users.bob,
      programId: ID.programs.dataSci,
      enrolledAt: daysAgo(15),
      expectedCompletionDate: daysFromNow(27),
      overallProgressPercent: 130, // 🐞 ANOMALY: Progress > 100%
      currentStreakDays: 2,
      isAtRisk: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.enrollments.carolBusiness,
      userId: ID.users.carol,
      programId: ID.programs.business,
      enrolledAt: daysAgo(18),
      expectedCompletionDate: daysFromNow(10),
      overallProgressPercent: -5, // 🐞 ANOMALY: Progress < 0%
      currentStreakDays: 0,
      isAtRisk: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: ID.enrollments.daveWebDev,
      userId: ID.users.dave,
      programId: ID.programs.webDev,
      enrolledAt: daysAgo(50),
      expectedCompletionDate: daysAgo(1),
      overallProgressPercent: 40, // 🐞 ANOMALY: Inconsistent (Stored 40, but 0 completions in table)
      currentStreakDays: 0,
      isAtRisk: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  await db.insert(schema.enrollments).values(enrollmentData);

  // --- LESSON COMPLETIONS ---
  await db.insert(schema.lessonCompletions).values([
    {
      id: "ffffffff-0000-4000-f000-000000000001",
      enrollmentId: ID.enrollments.aliceWebDev,
      lessonId: ID.lessons.htmlIntro,
      completedAt: daysAgo(5),
      completionSource: "MANUAL",
      idempotencyKey: "alice-1",
      createdAt: new Date(),
    },
    {
      id: "ffffffff-0000-4000-f000-000000000002",
      enrollmentId: ID.enrollments.aliceWebDev,
      lessonId: ID.orphanLessonId, // 🐞 ANOMALY: Orphaned Completion (Lesson ID does not exist)
      completedAt: daysAgo(2),
      completionSource: "AUTO_QUIZ",
      idempotencyKey: "alice-orphan",
      createdAt: new Date(),
    },
    {
      id: "ffffffff-0000-4000-f000-000000000003",
      enrollmentId: ID.enrollments.bobDataSci,
      lessonId: ID.lessons.pyIntro,
      completedAt: daysAgo(1),
      completionSource: "MANUAL",
      idempotencyKey: "bob-1",
      createdAt: new Date(),
    },
    // {
    //   id: "ffffffff-0000-4000-f000-000000000004", // 🐞 ANOMALY: Duplicate completion record
    //   enrollmentId: ID.enrollments.bobDataSci,
    //   lessonId: ID.lessons.pyIntro,
    //   completedAt: daysAgo(1),
    //   completionSource: "MANUAL",
    //   idempotencyKey: "bob-1-duplicate",
    //   createdAt: new Date(),
    // },
  ]);

  // 2. Re-enable Foreign Key checks
  await db.execute(sql`SET session_replication_role = 'origin';`);

  console.log("✅ Seed complete. Anomalies are ready for testing.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
