"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollmentsRelations = exports.lessonsRelations = exports.modulesRelations = exports.lessonCompletions = exports.enrollments = exports.lessons = exports.modules = exports.programs = exports.completionSourceEnum = exports.completionTypeEnum = exports.statusEnum = exports.levelEnum = exports.categoryEnum = void 0;
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
exports.categoryEnum = (0, pg_core_1.pgEnum)("category", [
    "PROGRAMMING",
    "DATA_SCIENCE",
    "BUSINESS",
    "OTHER",
]);
exports.levelEnum = (0, pg_core_1.pgEnum)("level", [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
]);
exports.statusEnum = (0, pg_core_1.pgEnum)("status", ["DRAFT", "PUBLISHED"]);
exports.completionTypeEnum = (0, pg_core_1.pgEnum)("completion_type", [
    "MANUAL",
    "AUTO_QUIZ",
]);
exports.completionSourceEnum = (0, pg_core_1.pgEnum)("completion_source", [
    "MANUAL",
    "AUTO_QUIZ",
]);
exports.programs = (0, pg_core_1.pgTable)("programs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, exports.categoryEnum)("category").notNull(),
    level: (0, exports.levelEnum)("level").notNull(),
    durationWeeks: (0, pg_core_1.integer)("duration_weeks").notNull(),
    status: (0, exports.statusEnum)("status").default("DRAFT"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.modules = (0, pg_core_1.pgTable)("modules", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    programId: (0, pg_core_1.uuid)("program_id").references(function () { return exports.programs.id; }),
    title: (0, pg_core_1.text)("title").notNull(),
    sequenceOrder: (0, pg_core_1.integer)("sequence_order").notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.lessons = (0, pg_core_1.pgTable)("lessons", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    moduleId: (0, pg_core_1.uuid)("module_id").references(function () { return exports.modules.id; }),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description"),
    durationMinutes: (0, pg_core_1.integer)("duration_minutes"),
    completionType: (0, exports.completionTypeEnum)("completion_type").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.enrollments = (0, pg_core_1.pgTable)("enrollments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    programId: (0, pg_core_1.uuid)("program_id").references(function () { return exports.programs.id; }),
    enrolledAt: (0, pg_core_1.timestamp)("enrolled_at").defaultNow().notNull(),
    expectedCompletionDate: (0, pg_core_1.timestamp)("expected_completion_date"),
    overallProgressPercent: (0, pg_core_1.integer)("overall_progress_percent").default(0),
    currentStreakDays: (0, pg_core_1.integer)("current_streak_days").default(0).notNull(),
    lastLessonCompletedAt: (0, pg_core_1.timestamp)("last_lesson_completed_at"),
    isAtRisk: (0, pg_core_1.boolean)("is_at_risk").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.lessonCompletions = (0, pg_core_1.pgTable)("lesson_completions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    enrollmentId: (0, pg_core_1.uuid)("enrollment_id").references(function () { return exports.enrollments.id; }),
    lessonId: (0, pg_core_1.uuid)("lesson_id").references(function () { return exports.lessons.id; }),
    completedAt: (0, pg_core_1.timestamp)("completed_at").defaultNow(),
    completionSource: (0, exports.completionSourceEnum)("completion_source").notNull(),
    idempotencyKey: (0, pg_core_1.text)("idempotency_key").unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, function (t) { return ({
    // Unique constraint: same lesson can only be completed once per enrollment
    uniqueEnrollmentLesson: (0, pg_core_1.unique)().on(t.enrollmentId, t.lessonId),
}); });
exports.modulesRelations = (0, drizzle_orm_1.relations)(exports.modules, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        program: one(exports.programs, {
            fields: [exports.modules.programId],
            references: [exports.programs.id],
        }),
        lessons: many(exports.lessons),
    });
});
exports.lessonsRelations = (0, drizzle_orm_1.relations)(exports.lessons, function (_a) {
    var one = _a.one;
    return ({
        module: one(exports.modules, {
            fields: [exports.lessons.moduleId],
            references: [exports.modules.id],
        }),
    });
});
exports.enrollmentsRelations = (0, drizzle_orm_1.relations)(exports.enrollments, function (_a) {
    var one = _a.one;
    return ({
        program: one(exports.programs, {
            fields: [exports.enrollments.programId],
            references: [exports.programs.id],
        }),
    });
});
