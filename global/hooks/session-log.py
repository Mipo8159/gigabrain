#!/usr/bin/env python3
"""PreCompact + SessionEnd hook: one pointer row per event in inbox/sessions.jsonl.

Why: 13 of 18 gigabrain sessions (2026-09-17..10-17, bin/usage-report) ended
without /retro, and their lessons were never harvested. The transcripts stay on
disk (cleanupPeriodDays 365), so the hook only records *where* they are; /retro
step 0 reads the rows since its last run and mines the sessions it missed.
Idea from claude-diary (github.com/rlancemartin/claude-diary), minus the model
call: a SessionEnd hook gets 1.5 s, so this stays a plain append (~30 ms).

Never blocks (always exit 0). Skips eval and temp-dir sessions.
Test: echo '{"hook_event_name":"SessionEnd","session_id":"s","transcript_path":"/t.jsonl",
"cwd":"/Users/x/projects/a","reason":"prompt_input_exit"}' | GIGABRAIN_SESSION_LOG=/tmp/s.jsonl python3 session-log.py
"""
import datetime
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOG = pathlib.Path(os.environ.get("GIGABRAIN_SESSION_LOG") or ROOT / "inbox" / "sessions.jsonl")
TEMP = ("/private/", "/var/folders/", "/tmp/")


def project(cwd):
    """Repo name, not the leaf dir: a worktree (.../repo/.claude/worktrees/routine) is still 'repo'."""
    head = cwd.split("/.claude/worktrees/")[0]
    p = pathlib.Path(head)
    for q in (p, *p.parents):
        if (q / ".git").exists():
            return q.name
    return p.name


def main():
    try:
        d = json.load(sys.stdin)
    except ValueError:
        return
    if not isinstance(d, dict):
        return
    cwd = str(d.get("cwd") or "")
    if not cwd or cwd.startswith(TEMP) or os.environ.get("CLAUDE_CODE_ENTRYPOINT", "").startswith("sdk"):
        return
    row = {"t": datetime.datetime.now().isoformat(timespec="seconds"),
           "event": d.get("hook_event_name", "?"),
           "session_id": d.get("session_id", ""),
           "project": project(cwd),
           "cwd": cwd,
           "transcript": d.get("transcript_path", ""),
           "why": d.get("reason") or d.get("trigger") or ""}
    try:
        LOG.parent.mkdir(exist_ok=True)
        with LOG.open("a") as f:
            f.write(json.dumps(row) + "\n")
    except OSError:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a hook must never break session end or compaction
        pass
