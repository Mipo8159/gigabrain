---
name: scout-sources-by-api-then-licence-tier
description: When scouting outside repos to learn from or absorb, verify stars/last push/licence through the GitHub API and sort by licence into absorb / clone / read before recommending anything.
metadata:
  type: project
---

Scouting outside knowledge sources (skill packs, reference apps, learning
corpora) is a two-step job. First pull the facts from the GitHub API, not from
search snippets: stars, last push, licence. Then put each repo in one tier:
**absorb** (permissive licence and AI-shaped content), **clone and run**
(reference code, kept outside gigaforge), or **read only** (no licence,
NOASSERTION or share-alike).

**Why:** on 2026-10-05, while looking for repos like ECC, search results
carried no licence data at all. The API showed that three of the most attractive
visual/tutor skills had no licence, so they could not be absorbed. It also
showed that a well-known AWS samples repo reports NOASSERTION even though its
LICENSE file is MIT-0. Without the API pass the shortlist would have recommended
absorbing content we may not copy. Popular "awesome" aggregators turned out to
have nothing original to absorb.

**How to apply:** `curl -s https://api.github.com/repos/<owner>/<repo>` (the
`gh` CLI is not installed on Giga's machine) for `stargazers_count`,
`pushed_at`, `license.spdx_id`. For NOASSERTION, read the LICENSE file before
deciding. List plugin/skill directories through the contents API to name the
exact subset to absorb. Write the shortlist into `library/candidates/README.md`
with a "studied, not absorbed" table so the next scout does not redo the work.
Stars mean popularity, not quality: `/absorb` triage still reads the files.

**Signal:** "find repos like X", "what can we absorb", "best resources to learn Y".

**Next time:** run the API pass on every candidate in one batch, then present
three tiers plus the gaps no repo fills. Related: [[steer-parallelism-and-agent-roles]].
