# Core Endpoints

## 1. Get Enrollment Progress

### GET /enrollments/:enrollmentId

Returns full learner progress with module breakdown.

### Example

```bash
curl http://localhost:3000/enrollments/{id}
```

### Response

```json
{
  "overall_progress_percent": 55,
  "current_streak_days": 3,
  "modules": [...]
}
```

---

## 2. Manual Lesson Completion

### POST /enrollments/:enrollmentId/lessons/:lessonId/complete

Marks lesson complete manually.

### Behavior

- Prevents duplicates
- Recalculates progress
- Updates streak
- Recomputes at-risk flag

---

## 3. Quiz Webhook (Idempotent)

### POST /quizzes/webhook

Payload:

```json
{
  "idempotency_key": "quiz-event-123",
  "enrollment_id": "uuid",
  "lesson_id": "uuid",
  "completed_at": "2026-01-01T10:00:00Z"
}
```

### Guarantees

- Always returns 200
- Deduplicated via idempotency key
- Safe against retries

---

# Admin Endpoints

## 4. At-Risk Learners

### GET /admin/programs/:programId/at-risk-learners

Returns learners who meet ALL criteria:

- Enrolled > 7 days
- Progress < 50%
- Streak = 0
- Deadline within 14 days

---

## 5. Program Learner Overview

### GET /admin/programs/:programId/learners

Includes:

- Actual vs expected progress
- Behind schedule flag
- Streak

---

## 6. Data Quality Report

### GET /admin/data-quality/report

Detects:

- Progress > 100
- Progress < 0
- Orphaned completions
- Duplicate completions
- Inconsistent stored progress

---

## 7. Repair Inconsistent Progress

### POST /admin/data-quality/fix-inconsistent-progress

Recalculates and fixes incorrect stored progress.

---
