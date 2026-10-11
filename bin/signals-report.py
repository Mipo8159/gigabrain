#!/usr/bin/env python3
"""Turn coach signals into monthly rates, the evidence behind scorecard re-scores.

  bin/signals-report.py              # live: inbox/signals.jsonl (written by coach.py)
  bin/signals-report.py --history    # baseline: replay ~/.claude/history.jsonl through coach.py
  bin/signals-report.py --file X     # any signals jsonl (tests)

Rates are % of prompts. Lower is better for every column except `done%`
(share of build requests that carried a done-criterion), where higher is better.
"""
import collections
import importlib.util
import json
import pathlib
import sys

G = pathlib.Path(__file__).resolve().parents[1]
COLS = ["no_done", "debug_no_hypothesis", "asks_status", "vague", "multi_task", "research"]


def from_history():
    spec = importlib.util.spec_from_file_location("coach", G / "global/hooks/coach.py")
    coach = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(coach)
    import datetime
    for line in open(pathlib.Path.home() / ".claude/history.jsonl"):
        r = json.loads(line)
        p = (r.get("display") or "").strip()
        if not p or p.startswith(("/", "!")):
            continue
        month = datetime.datetime.fromtimestamp(r["timestamp"] / 1000).strftime("%Y-%m")
        yield {"t": month, **coach.cues(p)[1]}


def from_file(path):
    for line in open(path):
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            continue


def main():
    args = sys.argv[1:]
    if "--history" in args:
        rows = from_history()
    else:
        path = args[args.index("--file") + 1] if "--file" in args else G / "inbox/signals.jsonl"
        if not pathlib.Path(path).exists():
            print("no signals yet (coach hook not installed, or no prompts since)")
            return
        rows = from_file(path)

    months = collections.defaultdict(collections.Counter)
    for r in rows:
        m = months[r["t"][:7]]
        m["prompts"] += 1
        m["build"] += bool(r.get("build"))
        for c in COLS:
            m[c] += bool(r.get(c))

    print("| month | prompts | done% (↑) | " + " | ".join(f"{c} (↓)" for c in COLS) + " |")
    print("|---" * (len(COLS) + 3) + "|")
    for month in sorted(months):
        m = months[month]
        n, b = m["prompts"], m["build"]
        done = f"{100 * (b - m['no_done']) / b:.0f}%" if b else "–"
        print(f"| {month} | {n} | {done} | " + " | ".join(f"{100 * m[c] / n:.0f}%" for c in COLS) + " |")


if __name__ == "__main__":
    main()
