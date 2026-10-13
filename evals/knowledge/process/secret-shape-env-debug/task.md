---
timeout: 600
heldout: true
check: node hidden/grade.cjs
---
Since we rotated the database password last night, the API can't log in to Postgres:
`password authentication failed for user "app"`. The DBA double-checked the new value in `.env` and it's
right. Nothing else changed. Can you find out what's going on and fix it?
