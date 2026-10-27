---
name: impact-review-traces-query-inputs
description: "A vendor-deprecation impact review isn't done when a grep for the deprecated feature finds nothing: find every caller of the endpoint, trace where each query's text comes from (user/customer config can carry the feature), prove 'not running' with a positive control, and size the proof to the worst case."
metadata:
  type: feedback
---

**In short:** "the code never uses X" is only half an impact review. The other
half is "can X reach the API through this call at all?", which depends on
where the request's *inputs* come from.

**Why:** 2026-10-22, a work repo. A deprecation scanner flagged new limits on
an issue tracker's search API (two JQL functions now fail above 10k items; comments
and history are truncated in search results). The first pass grepped for the two
function names (0 hits) and read the main poller, which builds a fixed query
and requests two fields. The answer was "no impact", and a ticket comment was drafted.
Giga asked "are you absolutely sure about the comment?". The claim-by-claim
recheck found:
- a legacy poller in another repo that **appends customer-written query text**
  to its search. A grep for the function names can never rule that out;
- one claim in the draft that was an inference stated as fact ("its auth
  style is dead on the cloud, so it's unused"; that auth style still works with
  an API token);
- a second caller (a search builder) with no callers of its own: dead code.
"Not running" was then shown with logs: 0 job-start lines in 30 days. That only
counted once a control query showed the same app *does* ship logs (~1.7k/day).
Giga then asked whether that depth was worth it for a dead legacy path. Finding the
path was. The three extra log queries were more than its small worst case needed.

**How to apply:**
- List callers by the **endpoint** across every repo, not only by the
  deprecated feature's name.
- For each caller, ask where the query text comes from. Fixed in code, or
  built from config, user input or customer settings? Config-built queries stay
  "possible" until the config is checked or the caller is shown not to run.
- A 0 in logs needs a positive control: the same source logging *something* in
  the window. Without it, a 0 means "dead or invisible".
- Before posting a finding to a ticket, re-verify each claim against code. Mark
  inferences as inferences.
- Size the proof to the worst case. A legacy path whose failure is a logged error
  can close on code evidence plus "reopen if anyone knows otherwise".

**Signal:** "check whether this API change/deprecation affects us", or a scanner
ticket that says "needs human review".
**Next time:** deliver a table of caller (file:line) | query source (fixed /
config / customer) | uses the feature? | still running? (evidence), before
drafting any comment.

Second instance the same day: a vendor IP-range review whose first verdict missed the proxy WAF; see [[vendor-ip-lists-label-direction-from-their-side]]. Both times the first verdict came before every entry point was listed.

**Third instance (2026-10-26, a service removal in a work repo):** the first
answer to "which repos must change to remove this service" was 9 repos: every
repo where a grep hit. Giga pushed back, and a dependency check cut it to 5. He
then asked "how can I be certain you won't give another answer in a few steps?".
The fix wasn't more confidence; it was showing the method. Each hit was classified
by one stated rule: *if left unchanged, does it break at runtime, in CI or in local
dev, or does it still route to, discover or grant access to the removed thing?*
An unanchored agent re-derived the list from the code alone and got the same 5.
Then a sweep of the org's repos that were **not cloned locally** (shallow clones
into scratch, then grep) closed the "what's online but not here" question. The code
search API had matched whole tokens only and was rate-limited. Traffic in the APM
tool confirmed it: the only live calls were side effects of two lifecycle actions.
- For removal scope, show the necessity rule and a per-hit verdict (required /
  kept, with the reason) in the **first** answer. Never present a grep-hit count as scope.
- Coverage = every active repo, including the uncloned ones. Say how many, and how.

Related: [[ticket-names-where-code-used-to-live]], [[prove-the-check-reached-the-change]], [[fact-check-generated-knowledge]].
