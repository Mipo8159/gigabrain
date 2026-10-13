---
timeout: 900
check: node hidden/grade.cjs
---
`src/orders` has collected a lot of cruft over the last few sprints and new people find it hard to follow.
Please clean up and simplify the module: get rid of what isn't used and make it easier to read.
Behaviour must stay the same (`npm test`).
