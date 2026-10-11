#!/usr/bin/env python3
"""UserPromptSubmit hook: cheap, deterministic coaching cues for every prompt.

No model call, no network: regex heuristics only, so it adds ~0 latency. Its
stdout is added to Claude's context for this turn. Claude decides whether a
cue is real and, if so, ends the reply with one 💡 line.

It also appends anonymous signal flags (never prompt text) to
inbox/signals.jsonl. /retro and /curate turn those into scorecard trends
and update brain/coaching.md, which this hook injects as the *current focus*,
together with the roadmap's `Now:` milestone (me/roadmap.md). So the coaching
changes as Giga does.

Test: echo '{"prompt":"add an endpoint","cwd":"/x"}' | python3 coach.py
"""
import datetime
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
FOCUS = ROOT / "brain" / "coaching.md"
ROADMAP = ROOT / "me" / "roadmap.md"
SIGNALS = ROOT / "inbox" / "signals.jsonl"
SEEN = ROOT / "inbox" / ".coach-sessions"   # sessions that already got the focus once

BUILD = re.compile(r"\b(add|create|implement|build|make|fix|update|refactor|change|extend|remove|migrate|write)\b", re.I)
DONE = re.compile(r"done when|should (return|respond|show|fail|pass)|expect|verify|prove|test|curl|criteria|so that|must (return|fail|pass)", re.I)
BROKEN = re.compile(r"dis+ap+e+a?r|not (being )?reflected|isn'?t (showing|working|updating)|does ?n[o']?t (show|load|work|appear|save|update)|not (showing|loading|saving)|stopped working|not working|doesn'?t work|broken|fails?|failing|error|exception|stack ?trace|help me fix|still not|why is this", re.I)
EXPECTED = re.compile(r"expected|should (be|have|return)|instead of|used to|since (yesterday|the)|i suspect|hypothes|yesterday|it was (all )?fine|worked (before|until)", re.I)
RESEARCH = re.compile(r"best (way|practice|approach)|which (library|lib|tool|framework|version)|\bvs\.?\s|\bversus\b|latest (version|release)|up to date|still maintained|production ready|alternatives? (to|for)", re.I)
STATUS = re.compile(r"^(so )?(is )?(it|everything|all)( good| set| done| working| works| fine)?( to go| now| up)?\s*\?$|works now\?|all good( to go)?\?|everything (is )?set( up)?\?|that'?s it\?|is it done\?", re.I)
SHORT_COMMAND = re.compile(r"\b(fix|do|run|adjust|implement|change|update|make)\b( it| this| that| them)?\W*$", re.I)
LIST_ITEM = re.compile(r"(^|\n)\s*(\d+[.)]|[-*])\s+\S")
ALSO = re.compile(r"\b(also|another|additionally|as well)\b", re.I)
WRAPUP = re.compile(r"(that'?s (it|all)|done for (today|now|the day)|wrap(ping)? up|good ?night|bye|see you|let'?s stop|i'?m done|calling it)", re.I)
ASKING = re.compile(r"^\s*(show me|explain|teach me|tell me|what|where|why|how|which|is|are|was|were|will|would|so)\b", re.I)
REQUEST = re.compile(r"\b(help me|can you|could you|could we|please|i need|i want|let'?s)\b", re.I)
TERMINAL_PASTE = re.compile(r"drwx|^\S*otal \d+|\$ \w+", re.M)
TRIVIAL = re.compile(r"^(y|yes|no|ok|okay|exit|continue|go|thanks|thank you|nice|perfect|allright|alright)\W*$", re.I)


def git_root(cwd):
    d = pathlib.Path(cwd or ".")
    for q in [d, *d.parents]:
        if (q / ".git").exists():
            return q
    return None


def worktree_hint(cwd):
    root = git_root(cwd)
    if root:
        return f"in a 2nd terminal: `cd {root} && claude -w <task-name>`"
    subs = [c.name for c in pathlib.Path(cwd or ".").iterdir() if (c / ".git").exists()] if cwd and os.path.isdir(cwd) else []
    if subs:
        return f"this folder isn't a git repo; for the single-repo part: `cd {subs[0]} && claude -w <task-name>` (repos here: {', '.join(subs)})"
    return "worktrees need a git repo (`git init` first)"


def milestone():
    """The roadmap's `**Now:**` line, or ''."""
    try:
        for line in ROADMAP.read_text().splitlines():
            if line.startswith("**Now:**"):
                return line[len("**Now:**"):].strip()
    except OSError:
        pass
    return ""


def cues(p, cwd=""):
    out, flags = [], {}
    question = bool(ASKING.match(p)) or (p.rstrip().endswith("?") and not REQUEST.search(p))
    building = bool(BUILD.search(p)) and not question and not TERMINAL_PASTE.search(p)
    flags["build"] = building
    broken = bool(BROKEN.search(p))
    if building and not broken and not DONE.search(p):
        flags["no_done"] = True
        if len(p) > 200:
            # Firm coaching (agreed 2026-10-05): a substantial build without a done-line gets asked, not guessed.
            out.append("Substantial build with no done-criterion. Firm coaching: put 'done when / env / access' into "
                       "your one up-front question batch (offer your proposed proof as the recommended option) before "
                       "building. One question, no lecture.")
        else:
            out.append("Build/change request with no done-criterion. Before starting, state how you will prove it's done; "
                       "tip: add 'Done when: <observable result>'.")
    if broken and not EXPECTED.search(p):
        flags["debug_no_hypothesis"] = True
        out.append("Bug report without expected/actual/hypothesis. Follow debug-protocol (reproduce first); "
                   "tip: 'Expected X, got Y, changed since Z, I suspect W'.")
    items = len(LIST_ITEM.findall(p)) + len(ALSO.findall(p))
    if building and items >= 3:
        flags["multi_task"] = True
        out.append(f"~{items} separable parts. Use subagents for independent research/review yourself; for an "
                   f"independent code change suggest a parallel session, {worktree_hint(cwd)}. Say which, in one line, before starting.")
    if RESEARCH.search(p) and (not building or "?" in p):
        flags["research"] = True
        out.append("Research/comparison question. Delegate to the `researcher` agent (live, cited sources) "
                   "instead of answering from training memory.")
    if building and len(p) > 600:
        flags["big_spec"] = True
        out.append("Large spec. Propose a short plan (or suggest plan mode) and get one OK before writing code.")
    if STATUS.search(p.strip()):
        flags["asks_status"] = True
        out.append("Giga is asking whether it's done/working. Answer with PROOF (command + output, test result), not "
                   "assurance; tip: next time put 'Done when: …' in the original request.")
    elif len(p) < 25 and SHORT_COMMAND.search(p) and not TRIVIAL.match(p.strip()):
        flags["vague"] = True
        out.append("Very short prompt. If scope is ambiguous, ask ONE batched question rather than guessing.")
    if WRAPUP.search(p) and len(p) < 80 and not p.rstrip().endswith("?"):
        flags["wrapup"] = True
        out.append("Giga seems to be wrapping up. If this session did meaningful work and /retro hasn't run, "
                   "offer it in ONE line: 'Run /retro before you go? It saves what we learned to the brain and pushes it.'")
    return out, flags


MACHINE_PREFIXES = ("Another Claude session sent a message", "[SYSTEM NOTIFICATION", "<task-notification",
                    "<system-reminder", "[Subagent hand-back]", "[Request interrupted")


def main():
    if os.environ.get("GIGAFORGE_HARVEST"):
        return
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return
    p = (data.get("prompt") or "").strip()
    if not p or p.startswith("/") or p.startswith("!"):
        return
    # Subagent hand-backs and harness notifications arrive as "prompts" too. They
    # are not Giga's words: no cues, and no signal rows (2026-10-03: 20 of 29 rows
    # that day were agent reports, all flagged build/multi_task/big_spec).
    if p.startswith(MACHINE_PREFIXES):
        return
    out, flags = cues(p, data.get("cwd", ""))

    try:
        if os.environ.get("GIGAFORGE_NO_SIGNALS"):
            raise OSError("test run")
        SIGNALS.parent.mkdir(exist_ok=True)
        with SIGNALS.open("a") as f:
            f.write(json.dumps({"t": datetime.datetime.now().isoformat(timespec="seconds"),
                                "project": pathlib.Path(data.get("cwd", "")).name,
                                "len": len(p), **flags}) + "\n")
    except OSError:
        pass

    focus = FOCUS.read_text().strip() if FOCUS.exists() else ""
    sid = data.get("session_id", "")
    first = False
    if sid and not os.environ.get("GIGAFORGE_NO_SIGNALS"):
        try:
            seen = SEEN.read_text().split() if SEEN.exists() else []
            if sid not in seen:
                first = True
                SEEN.write_text("\n".join((seen + [sid])[-200:]) + "\n")
        except OSError:
            pass
    if not (out or first):
        focus = ""   # repeat the focus only when a cue makes it relevant
    if not out and not focus:
        return
    lines = ["[gigaforge coach] Hidden context, don't quote it."]
    if out:
        lines.append("Cues for this prompt:")
        lines += [f"- {c}" for c in out]
    if focus:
        lines.append("Giga's current coaching focus (from brain/coaching.md):")
        lines.append(focus)
        now = milestone()
        if now:
            lines.append(f"Roadmap milestone (me/roadmap.md): {now} If this session can advance it, say so in one line; "
                         "don't hijack an unrelated task.")
    lines.append("Act on real cues (plan, agent, worktree, proof) as part of the work. If one would have "
                 "materially improved the prompt or workflow, end the reply with exactly one line: "
                 "'💡 <tip with a short example>'. Skip it when the prompt was already good. Never lecture.")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
