#!/usr/bin/env python3
"""Claude Code statusline: model · context % · session cost · 5h limit · branch · roadmap step.

Installed by bin/install.sh as settings.statusLine. Claude Code pipes a JSON
blob on stdin (fields: code.claude.com/docs/en/statusline) after each assistant
message; one line goes to stdout. Context turns yellow at 50% and red at 75%:
that is the moment to /compact or start a fresh session seeded with a summary
(coaching focus "One goal per session").

Test: echo '{"model":{"display_name":"Opus"},"context_window":{"used_percentage":62},
"cost":{"total_cost_usd":1.234},"workspace":{"current_dir":"/tmp"}}' | python3 statusline.py
"""
import json
import pathlib
import re
import subprocess
import sys

ROADMAP = pathlib.Path(__file__).resolve().parents[1] / "me" / "roadmap.md"
DIM, YEL, RED, RST = "\033[2m", "\033[33m", "\033[31m", "\033[0m"


def color(pct, text):
    return f"{RED if pct >= 75 else YEL if pct >= 50 else ''}{text}{RST}"


def branch(cwd):
    try:
        b = subprocess.run(["git", "-C", cwd, "branch", "--show-current"], capture_output=True,
                           text=True, timeout=1).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""
    if "/.claude/worktrees/" in cwd:
        b = f"wt:{b}"
    return b


def now_step():
    try:
        m = re.search(r"^\*\*Now:\*\*\s*([^.]+)", ROADMAP.read_text(), re.M)
    except OSError:
        return ""
    return m.group(1).strip()[:40] if m else ""


def get(o, *keys):
    """Nested lookup that tolerates null, strings and missing keys (runs after every message)."""
    for k in keys:
        o = o.get(k) if isinstance(o, dict) else None
    return o


def num(x):
    return x if isinstance(x, (int, float)) else None


def main():
    try:
        d = json.load(sys.stdin)
    except ValueError:
        d = {}
    parts = [str(get(d, "model", "display_name") or "?")]
    ctx = num(get(d, "context_window", "used_percentage"))
    if ctx is not None:
        parts.append(color(ctx, f"ctx {ctx:.0f}%"))
    cost = num(get(d, "cost", "total_cost_usd"))
    if cost is not None:
        parts.append(f"${cost:.2f}")
    five = num(get(d, "rate_limits", "five_hour", "used_percentage"))
    if five is not None:
        parts.append(color(five, f"5h {five:.0f}%"))
    cwd = str(get(d, "workspace", "current_dir") or get(d, "cwd") or "")
    b = branch(cwd) if cwd else ""
    if b:
        parts.append(b)
    step = now_step()
    if step:
        parts.append(f"{DIM}now: {step}{RST}")
    print(" · ".join(parts))


if __name__ == "__main__":
    try:
        main()
    except Exception:  # never break the status bar; show the model-less fallback
        print("?")
