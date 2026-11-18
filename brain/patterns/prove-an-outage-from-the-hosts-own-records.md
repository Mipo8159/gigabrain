---
name: prove-an-outage-from-the-hosts-own-records
description: "\"Was this outage us?\" is answered from the host's own records (boots, kernel OOM, an always-on outbound agent's log, sysstat, the app's run ledger), plus a second path that ends on a different device. Outside checks alone can't separate 'site down' from 'our VM froze' or 'our IP banned'."
metadata:
  type: feedback
---

**In short:** don't call an outage "not us" from outside checks alone. Split the
three look-alikes (site/edge down, host frozen, only our IP blocked) with a
second vantage point, then read the host's own records once it is reachable.

**Why:** 2026-11-18, a client server behind the client's firewall went dark at
night while the client was clicking a downloader. From outside, TCP timeouts on
80/443 everywhere. Claude said "almost certainly not our code" early, then had
to walk it back twice: first for "maybe the firewall banned our IP" (all checks
came from one IP), then for "maybe a run froze the VM" (the outage began at a
scheduled run time, the container had no memory limit). The client wanted a
guarantee. What settled it was the host itself:
- `last -x reboot` / `journalctl --list-boots`: no reboot through the outage;
- the CI runner's journal (an always-on outbound poller): "connect error" at
  03:12, "Connected" at 03:56 = the host itself lost the internet;
- the app's run ledger: LAN runs kept succeeding through the outage;
- kernel log: no OOM, ever; sysstat: normal traffic, no flood.
Listing *failed* runs by time-of-day then found a separate daily 06:00 crash
(container exit 1, 16 of 16 days) that was the app's own bug.

**How to apply:**
1. Every outside check gets a control (`curl google`) and is timestamped to a
   log file; add a second vantage point (phone on mobile data) to rule out an
   IP block.
2. Find a path that ends on a *different* device (site VPN → the firewall). If
   it dies too, the shared part is upstream of the host.
3. Say "strong evidence, not proof" until step 4. Name the open alternative.
4. On the host (no sudo needed if the user is in `adm`): `uptime`,
   `last -x reboot`, `journalctl -k | grep -i oom`, the outbound agent's unit
   log (`actions.runner*`), `sar -n DEV` / `sar -r`, `ip -br link`, and the
   app's own run history across the window. Docker: exit 1 = app error,
   137 = OOM/kill; `journalctl | grep 'restarting container'` shows it.
5. Group failures by time-of-day: a fixed-time failure points at a scheduled
   job on someone's side, and the container log (needs sudo) names the error.

**Signal:** "is it our fault?", "I need a guarantee", an outage that starts near
one of our scheduled jobs, every outside check failing at once.
**Next time:** log + control + second vantage point immediately; hold the
verdict as "likely" until the host's boot, OOM and outbound-agent logs are read.

Related: [[line-up-incident-times-with-deploy-history]], [[outward-claims-carry-their-proof]],
[[unheard-error-event-kills-node]].
