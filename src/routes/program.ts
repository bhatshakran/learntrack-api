import { Router, Request, Response } from "express";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { programs, modules, lessons } from "../db/schema";
import { param } from "../lib/params";

const router = Router();

// ----------------------------------------------------------------
// GET /programs
// List all published programs
// ----------------------------------------------------------------
router.get("/", async (req: Request, res: Response) => {
  const allPrograms = await db.query.programs.findMany({
    where: eq(programs.status, "PUBLISHED"),
    orderBy: (programs, { asc }) => [asc(programs.createdAt)],
  });

  return res.json({ programs: allPrograms });
});

// ----------------------------------------------------------------
// GET /programs/:programId
// Get a single program with its modules and lessons
// ----------------------------------------------------------------
router.get("/:programId", async (req: Request, res: Response) => {
  const { programId } = req.params;

  const program = await db.query.programs.findFirst({
    where: eq(programs.id, param(programId)),
    with: {
      modules: {
        orderBy: [asc(modules.sequenceOrder)],
        with: {
          lessons: {
            orderBy: [asc(lessons.createdAt)],
          },
        },
      },
    },
  });
  console.log(program, ":::program");

  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }

  return res.json({ program });
});

// ----------------------------------------------------------------
// POST /programs
// Create a new program (admin)
// ----------------------------------------------------------------
const createProgramSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["PROGRAMMING", "DATA_SCIENCE", "BUSINESS", "OTHER"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  duration_weeks: z.number().int().positive(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = createProgramSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { title, description, category, level, duration_weeks, status } =
    parsed.data;

  const [created] = await db
    .insert(programs)
    .values({
      title,
      description,
      category,
      level,
      durationWeeks: duration_weeks,
      status,
    })
    .returning();

  return res.status(201).json({ program: created });
});

// ----------------------------------------------------------------
// POST /programs/:programId/modules
// Add a module to a program
// ----------------------------------------------------------------
const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sequence_order: z.number().int().nonnegative(),
});

router.post("/:programId/modules", async (req: Request, res: Response) => {
  let { programId } = req.params;
  programId = param(programId);
  const program = await db.query.programs.findFirst({
    where: eq(programs.id, param(programId)),
  });
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }

  const parsed = createModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { title, description, sequence_order } = parsed.data;

  const [created] = await db
    .insert(modules)
    .values({ programId, title, description, sequenceOrder: sequence_order })
    .returning();

  return res.status(201).json({ module: created });
});

// ----------------------------------------------------------------
// POST /programs/:programId/modules/:moduleId/lessons
// Add a lesson to a module
// ----------------------------------------------------------------
const createLessonSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
  completion_type: z.enum(["MANUAL", "AUTO_QUIZ"]),
});

router.post(
  "/:programId/modules/:moduleId/lessons",
  async (req: Request, res: Response) => {
    const { programId, moduleId } = req.params;

    // Make sure the module actually belongs to this program
    const module = await db.query.modules.findFirst({
      where: eq(modules.id, param(moduleId)),
    });
    if (!module || module.programId !== programId) {
      return res
        .status(404)
        .json({ error: "Module not found in this program" });
    }

    const parsed = createLessonSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { title, description, duration_minutes, completion_type } =
      parsed.data;

    const [created] = await db
      .insert(lessons)
      .values({
        moduleId: param(moduleId),
        title,
        description,
        durationMinutes: duration_minutes,
        completionType: completion_type,
      })
      .returning();

    return res.status(201).json({ lesson: created });
  },
);

// ----------------------------------------------------------------
// PATCH /programs/:programId
// Publish or update a program
// ----------------------------------------------------------------
const updateProgramSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  duration_weeks: z.number().int().positive().optional(),
});

router.patch("/:programId", async (req: Request, res: Response) => {
  const { programId } = req.params;

  const program = await db.query.programs.findFirst({
    where: eq(programs.id, param(programId)),
  });
  if (!program) {
    return res.status(404).json({ error: "Program not found" });
  }

  const parsed = updateProgramSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { title, description, status, duration_weeks } = parsed.data;

  const [updated] = await db
    .update(programs)
    .set({
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(duration_weeks && { durationWeeks: duration_weeks }),
      updatedAt: new Date(),
    })
    .where(eq(programs.id, param(programId)))
    .returning();

  return res.json({ program: updated });
});

export default router;
