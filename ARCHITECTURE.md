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

Now if there are 10,000 students suppose and all of them click on their dashboards this heavy calculation would run 10,000x which would put a heavy load on the database and the process would be slow.

---

# 🔄 Recalculation Triggers

Progress recalculates on:

- Manual completion
- Webhook completion
- Data repair jobs

---

# ⚡ Concurrency & Consistency

## Potential Race Conditions

- Multiple completions at same time
- Duplicate webhook deliveries

## Mitigations

- Unique constraint on (enrollment_id, lesson_id)
- Idempotency keys for webhooks
- Transactional updates via Postgres

---
