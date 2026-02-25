# Core Endpoints

## 1. Get Enrollment Progress

### GET /enrollments/:enrollmentId

Returns full learner progress with module breakdown.

### Example

Get Alice's enrollment (77% progress, streak 5)

```bash
curl http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000001
```

Get Carol's enrollment (at-risk, -5% progress anomaly)

```bash
curl http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000007
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

### Example

For Dave

```bash
curl -X POST http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000004/lessons/dddddddd-0000-4000-d000-000000000004/complete
```

### Behavior

- Prevents duplicates
- Recalculates progress
- Updates streak
- Recomputes at-risk flag

---

## 3. Quiz Webhook (Idempotent)

### POST /quizzes/webhook

For Carol

Payload:

```json
{
  "idempotency_key": "quiz-carol-stratIntro-001",
  "enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
  "lesson_id": "dddddddd-0000-4000-d000-000000000009",
  "completed_at": "2026-02-25T10:00:00Z"
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

### Example

(Carol — -5% progress, broken streak)

```bash
curl http://localhost:3000/admin/programs/bbbbbbbb-0000-4000-b000-000000000003/at-risk-learners
```

### Response

```json
{
  "at_risk_learners": [
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
      "user_id": "aaaaaaaa-3333-4333-a333-333333333333",
      "progress_percent": -5,
      "streak_days": 0,
      "days_until_deadline": 10,
      "risk_factors": ["low progress", "broken streak", "approaching deadline"]
    }
  ]
}
```

---

## 5. Program Learner Overview

### GET /admin/programs/:programId/learners

### Example

Get all learners in Web Dev

```bash
curl http://localhost:3000/admin/programs/bbbbbbbb-0000-4000-b000-000000000001/learners
```

### Response

```json
{
  "program_id": "bbbbbbbb-0000-4000-b000-000000000001",
  "learners": [
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000001",
      "user_id": "aaaaaaaa-1111-4111-a111-111111111111",
      "progress_percent": 77,
      "expected_progress_percent": 54,
      "is_behind_schedule": false,
      "streak_days": 5,
      "last_lesson_completed_at": null,
      "is_at_risk": false
    },
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000004",
      "user_id": "aaaaaaaa-4444-4444-a444-444444444444",
      "progress_percent": 40,
      "expected_progress_percent": 89,
      "is_behind_schedule": true,
      "streak_days": 0,
      "last_lesson_completed_at": null,
      "is_at_risk": true
    }
  ]
}
```

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

### Response

```json
{
  "total_enrollments_checked": 4,
  "anomalies": {
    "progress_over_100": ["eeeeeeee-0000-4000-e000-000000000006"],
    "progress_under_0": ["eeeeeeee-0000-4000-e000-000000000007"],
    "orphaned_completions": 1,
    "duplicate_completions": 0,
    "inconsistent_progress": 4
  },
  "details": [
    {
      "type": "orphaned_completions",
      "lesson_id": "00000000-0000-4000-0000-000000000000",
      "count": 1
    },
    {
      "type": "inconsistent_progress",
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
      "stored_progress": -5,
      "actual_progress": 0,
      "difference": -5
    },
    {
      "type": "inconsistent_progress",
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000004",
      "stored_progress": 40,
      "actual_progress": 0,
      "difference": 40
    },
    {
      "type": "inconsistent_progress",
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000006",
      "stored_progress": 130,
      "actual_progress": 100,
      "difference": 30
    },
    {
      "type": "inconsistent_progress",
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000001",
      "stored_progress": 77,
      "actual_progress": 50,
      "difference": 27
    }
  ]
}
```

---

## 7. Repair Inconsistent Progress

### POST /admin/data-quality/fix-inconsistent-progress

Recalculates and fixes incorrect stored progress.

---

### Response

```json
{
  "fixed_count": 4,
  "fixed": [
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000001",
      "old_progress": 77,
      "new_progress": 50
    },
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000006",
      "old_progress": 130,
      "new_progress": 100
    },
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
      "old_progress": -5,
      "new_progress": 0
    },
    {
      "enrollment_id": "eeeeeeee-0000-4000-e000-000000000004",
      "old_progress": 40,
      "new_progress": 0
    }
  ]
}
```
