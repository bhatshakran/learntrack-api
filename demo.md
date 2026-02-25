# 1. List all programs

curl http://localhost:3000/programs

# 2. Get Web Dev program with all modules and lessons

curl http://localhost:3000/programs/bbbbbbbb-0000-4000-b000-000000000001

# 3. Get Alice's enrollment (77% progress, streak 5)

curl http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000001

# 4. Get Carol's enrollment (at-risk, -5% progress anomaly)

curl http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000007

# 5. Get Bob's enrollment (130% progress anomaly)

curl http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000006

# 6. Mark a lesson complete for Dave (inconsistent progress anomaly, 0 completions)

curl -X POST http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000004/lessons/dddddddd-0000-4000-d000-000000000004/complete

# 7. Try marking the same lesson again (should be a no-op, not an error)

curl -X POST http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000004/lessons/dddddddd-0000-4000-d000-000000000004/complete

# 8. Send a webhook completion for Carol (stratIntro)

curl -X POST http://localhost:3000/quizzes/webhook \
 -H "Content-Type: application/json" \
 -d '{
"idempotency_key": "quiz-carol-stratIntro-001",
"enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
"lesson_id": "dddddddd-0000-4000-d000-000000000009",
"completed_at": "2026-02-25T10:00:00Z"
}'

# 9. Send the exact same webhook again (should return 200, already processed)

curl -X POST http://localhost:3000/quizzes/webhook \
 -H "Content-Type: application/json" \
 -d '{
"idempotency_key": "quiz-carol-stratIntro-001",
"enrollment_id": "eeeeeeee-0000-4000-e000-000000000007",
"lesson_id": "dddddddd-0000-4000-d000-000000000009",
"completed_at": "2026-02-25T10:00:00Z"
}'

# 10. Get at-risk learners for Web Dev (Dave — overdue, 40% stored but 0 actual)

curl http://localhost:3000/admin/programs/bbbbbbbb-0000-4000-b000-000000000001/at-risk-learners

# 11. Get at-risk learners for Business (Carol — -5% progress, broken streak)

curl http://localhost:3000/admin/programs/bbbbbbbb-0000-4000-b000-000000000003/at-risk-learners

# 12. Run the data quality report (should show all 5 anomalies)

curl http://localhost:3000/admin/data-quality/report

# 13. Get all learners in Web Dev with pacing info

curl http://localhost:3000/admin/programs/bbbbbbbb-0000-4000-b000-000000000001/learners

# 14. Clear DB

TRUNCATE lesson_completions, enrollments, lessons, modules, programs CASCADE;

# 15. Run the app

docker-compose up --build 2>&1 | tee docker.log

# Quick enrollment checks

GET http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000001 # Alice (77%, normal)
GET http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000006 # Bob (130%, anomaly)
GET http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000007 # Carol (-5%, anomaly)
GET http://localhost:3000/enrollments/eeeeeeee-0000-4000-e000-000000000004 # Dave (40% stored, 0 actual)
