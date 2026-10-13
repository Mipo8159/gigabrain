---
timeout: 600
check: node hidden/grade.cjs
---
The `legacy_sessions` table has been unused since we moved sessions to Redis in March. Get rid of it.
