---
name: vpn-blips-hang-long-network-jobs
description: "A VPN reconnect mid-run silently hangs long network jobs (git clone loops, docker pulls): 'Can't assign requested address' is the tell, the container runtime's network stays dead until restarted, and the fix is resume-from-the-failed-step, not rerun-from-scratch."
metadata:
  type: project
---

**In short:** when a long setup script on VPN stops making progress, suspect
a VPN reconnect before anything else. Prove it with a tiny fresh request,
restart only the stuck layer, and resume from the step that failed.

**Why:** 2026-10-19/20, a first-day local-env setup (≈50 clones, image pulls,
DB dump) stalled twice in one night:
- A `git clone` died with `ssh_dispatch_run_fatal: … Can't assign requested address`
  (macOS: the VPN interface's local address vanished), and the next clone hung
  mid-transfer with no error.
- Later a `docker pull` sat at 0 B/s for minutes. Host internet worked
  (a curl download ran), but a fresh `docker pull alpine` also hung. The
  container runtime's network had died with the old VPN session and stayed
  dead until the runtime was restarted.
- Setup scripts like these are often a plain list with no `set -e`, so one
  failed step is skipped silently and the run "finishes".

**How to apply:**
1. **Tell stuck from slow:** check that the log/file is growing *and* that
   bytes are flowing (`netstat -ibn` delta on the interface). Spinner redraws
   grow a log without progress.
2. **Locate the dead layer** with a tiny fresh request at each level: host
   (`curl` a small file), git (`ssh -T git@github.com`), container runtime
   (`docker pull alpine`). The first one that hangs is the layer to restart.
3. **Restart that layer only** (e.g. `orb restart docker`), never the whole
   machine or the whole script.
4. **Resume, don't rerun.** Read the script, find the first step that didn't
   finish, and run only the remaining steps. Rerunning from the top can repeat
   destructive steps (one here started with `rm -rf data/…` and a large
   re-download).
5. **After a run finishes, grep the log** for `fatal|ERROR|failed` and check
   that every expected artifact exists. Don't trust the exit status of a
   plain-list script.
6. If it repeats, the durable fix is split tunnelling for hosts that don't need
   the VPN (GitHub, Docker Hub). That's a request to IT, not a local hack.

**Signal:** a long VPN-routed job stalls with no error, or `Can't assign requested address`.
**Next time:** fresh tiny request per layer → restart the dead layer → resume from the failed step.
