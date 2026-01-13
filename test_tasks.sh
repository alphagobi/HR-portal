#!/bin/bash
curl -X POST http://localhost:8000/api/tasks.php \
-H "Content-Type: application/json" \
-d '{"user_id": 1, "task_content": "Test Task", "planned_date": "2026-01-14", "eta": "1h", "framework_id": 1}'
