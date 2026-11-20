---
name: test-each-repo-boundary-master-vs-branch
description: "A removal or contract change spread over several repos can't be run end to end locally when the stack needs live data. Test each repo boundary instead, mainline vs branch: diff the generated schema, validate the old client's real operations against the new schema, and boot the real gateway/proxy image with real prod/staging config on an offline docker network."
metadata:
  type: feedback
---

**Rule:** "test it end to end locally" for a multi-repo change means one check
per wire where a caller in repo A meets a callee in repo B, each run on the
mainline base and on the branch. The pair of results is the proof, and it also
proves the deploy order.

**Why:** 2026-11-06, an 8-PR service retirement. A full local stack needed live
DB dumps (off limits). Per-repo suites were already green, but none showed how
the repos fit. Three boundary checks did, in about 30 minutes:
- **Schema diff.** Printing the API schema from code on base and branch showed
  exactly 1 query + 2 types removed, nothing else.
- **Old client vs new schema.** The old UI's real query was valid on base and
  rejected on the branch. That turned "UI ships before API" from advice into a
  measured fact.
- **Real config, offline.** The proxy image booted with the real prod and staging
  route files on `docker network create --internal`. Base routed the path (503,
  no egress), the branch answered 410 and dropped it from discovery, and other
  routes were unchanged. The repo's own smoke test had only used a dev-data
  fixture.

**How to apply:**
- List the wires (caller → callee, with the repo on each side). Give every wire
  one base-vs-branch check.
- API: print the schema from both trees (`git worktree add --detach <base>`,
  symlink `node_modules`). Then `validate(buildSchema(branch), parse(oldQuery))`
  with the oldest client's real operation.
- Gateway or config: use the real env files with `--internal` networking, so a
  missed decommission can't call live AWS. Dummy values for required secret env
  vars stay local.
- Report the cells that couldn't be tested ("full stack with real data") as
  staging's job. Don't stretch the claim.

**Signal:** "test locally end to end", "how do these PRs tie together", a change
removing or renaming something that another repo calls.
**Next time:** draw the wire list first, then run one base-vs-branch check per
wire before building any full-stack setup.

**Isolation is proven on the container under test, not on a probe beside it (2026-11-20).**
A local Lambda e2e claimed "no route out" because the guard probe ran on a
`docker network create --internal` network. The function containers came from
`sam local invoke --docker-network <net>`, which creates each container on Docker's
default bridge first and only then *adds* the internal network (`docker inspect`:
`<net> bridge`). So the code under test had egress; one planted fault ("no endpoint
redirect") most likely sent a dummy-signed call to the real cloud API. A reviewer
caught it from the CLI source; nothing in the green run could.
- Start the containers yourself with `docker run --network <net>` only (the Lambda
  image ships a runtime emulator on :8080; invoke from inside the network), read
  handler/env/timeout from the built template.
- Guard = (a) `docker inspect` every container: networks == exactly `<net>`;
  (b) the egress probe runs *inside* each function container; (c) a planted fault
  (`docker network connect bridge <fn>`) must fail the guard.
**Signal:** a tool flag that "joins" a network (`--docker-network`, `--network` on a
wrapper CLI) plus a safety claim about isolation.
**Next time:** inspect the live container's network list before writing "no route out".
