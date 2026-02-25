# 🧮 Architecture Overview

## Progress Calculation Strategy

### Formula

**Module Progress**

```
completed_lessons / total_lessons
```

**Program Progress**

```
avg(module_progresses)
```

### Why average by module?

Prevents large modules from dominating progress.

### Storage Strategy

Progress is stored in:

```
enrollments.overall_progress_percent
```

**Why denormalize?**

I denormalized the progress percentage and at-risk status because these are 'Read-Heavy' values. By pre-calculating them during the 'Write' phase (when a lesson is completed), we significantly reduce the load on the database during dashboard views, ensuring the UI stays responsive at scale.

Example: If the progress percentage was not denormalized. For each student we would have to look up enrollment,then lessons in the program,his completions, then do the math: completions/total lessons \* 100.

Now suppose if there are 10,000 students and all of them click on their dashboards, this heavy calculation would run 10,000x which would put a heavy load on the database and the process would be slow.

---

# 🔄 Recalculation Triggers

Progress recalculates on:

- Manual completion
- Webhook completion
- Data repair jobs

---

# ⚡ Concurrency & Consistency

1. Unique constraint prevents duplicate completions:
   The lesson_completions table has a unique constraint on (enrollment_id, lesson_id). If two requests try to mark the same lesson complete simultaneously, only one INSERT succeeds at the database level — the other gets rejected before any progress calculation happens.
2. Progress is always recalculated from scratch:
   Rather than incrementing a stored counter (progress + 1), every completion triggers a full recalculation by querying all completed lessons from the database and recomputing the average. This means:
   - There is no accumulated state that can get corrupted
   - Even if two different lessons complete at the exact same millisecond and their progress writes briefly race, the stored value will be corrected on the very next completion
   - The completions table is always the source of truth — the stored overall_progress_percent is a cache of what the completions table says, not an independent value

3. The tradeoff:
   There is a small window where overall_progress_percent could be stale by one completion — for example if Alice completes lesson A and lesson B at the same instant, one update might overwrite the other. In practice this is extremely unlikely for a learning platform where completions happen minutes or hours apart, not milliseconds. If this became a concern at scale, the fix would be to wrap the completion + recalculation in a SELECT FOR UPDATE transaction to serialize writes per enrollment.

## Mitigations

- Unique constraint on (enrollment_id, lesson_id)
- Idempotency keys for webhooks
- Transactional updates via Postgres

---
