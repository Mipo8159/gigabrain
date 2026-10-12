---
name: business-invariants
description: Business rules for content-platform that must hold after every change; read by intent-reviewer.
metadata:
  type: project
---

- **INV-1** A `LESSON` never becomes a reel. Reels are a public free feed; lessons can be paid. Approving a LESSON creates a lesson in its course, never a reel. Why: CP-141 incident, paid lessons leaked to the feed. Paths: every approve path (single, bulk, scripts).
- **INV-2** Only `PENDING` content can change status; anything else gets 409 and nothing changes. Paths: approve, reject, bulk variants.
