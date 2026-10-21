---
name: vendor-ip-lists-label-direction-from-their-side
description: "A SaaS vendor's published IP list (e.g. ip-ranges.atlassian.com) tags each CIDR egress/ingress from the vendor's side: egress = traffic they send you (webhooks), ingress = where your calls to them land. Check whether any allowlist exists before planning to 'add the new range'."
metadata:
  type: feedback
---

**In short:** an "add the vendor's new IP range to our allowlists" ticket has two
questions hiding in it. Which half of the range matters, and is there an
allowlist at all?

**Why:** 2026-10-21, a work ticket said a new vendor range "must be added to
allowlists" so that inbound webhooks keep working. The live JSON list showed the
range split into a /23 tagged `egress` (the vendor sends from it, so webhooks
reach us from there) and a /23 tagged `ingress` (our API calls land there).
Read from our side, the labels look backwards. A grep of the infra repo then
found no vendor CIDRs anywhere, and the public load balancer security group was
open to `0.0.0.0/0`. The likely answer was "verified, nothing to add", not a
change.

**How to apply:**
1. `curl` the vendor's JSON and check overlap with Python `ipaddress`: print `direction` and `product` for every CIDR that overlaps the new range.
2. Inbound webhooks to you = the vendor's `egress` entries. Outbound calls from you = their `ingress` entries; these matter only if your egress rules are restricted.
3. Grep infra-as-code for the vendor's old CIDRs. If none are there, nothing filters on them in code.
4. The repo can't rule out rules created by hand in the console or a CDN/WAF outside the repo. Ask the infra owner, or run read-only cloud CLI with approval.
5. The strongest proof: request logs (`X-Forwarded-For`) showing 200s already arriving from the new range.

**Signal:** a ticket mentions a new vendor IP range, an allowlist, WAF or security groups.
**Next time:** answer "does an allowlist exist?" before planning any change.
Related: [[ticket-names-where-code-used-to-live]].
