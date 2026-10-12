---
tags: [trigger]
max_turns: 8
timeout_seconds: 240
allowed_tools: [Read, Glob, Grep, Skill]
---

the login started returning 500 this morning, help me fix this:

TypeError: Cannot read properties of undefined (reading 'id')
    at AuthService.validate (src/auth/auth.service.ts:42:31)
