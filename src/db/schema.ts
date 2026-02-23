import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", [
  "PROGRAMMING",
  "DATA_SCIENCE",
  "BUSINESS",
  "OTHER",
]);
export const levelEnum = pgEnum("level", [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
]);
export const statusEnum = pgEnum("status", ["DRAFT", "PUBLISHED"]);
export const completionTypeEnum = pgEnum("completion_type", [
  "MANUAL",
  "AUTO_QUIZ",
]);
export const completionSourceEnum = pgEnum("completion_source", [
  "MANUAL",
  "AUTO_QUIZ",
]);

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: categoryEnum("category").notNull(),
  level: levelEnum("level").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  status: statusEnum("status").default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const modules = pgTable("modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").references(() => programs.id),
  title: text("title").notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id").references(() => modules.id),
  title: text("title").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  completionType: completionTypeEnum("completion_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const enrollments = pgTable("enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  programId: uuid("program_id").references(() => programs.id),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  expectedCompletionDate: timestamp("expected_completion_date"),
  overallProgressPercent: integer("overall_progress_percent").default(0),
  currentStreakDays: integer("current_streak_days").default(0),
  lastLessonCompletedAt: timestamp("last_lesson_completed_at"),
  isAtRisk: boolean("is_at_risk").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessonCompletions = pgTable(
  "lesson_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id").references(() => enrollments.id),
    lessonId: uuid("lesson_id").references(() => lessons.id),
    completedAt: timestamp("completed_at").defaultNow(),
    completionSource: completionSourceEnum("completion_source").notNull(),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // Unique constraint: same lesson can only be completed once per enrollment
    uniqueEnrollmentLesson: unique().on(t.enrollmentId, t.lessonId),
  }),
);
