#!/usr/bin/env python3
"""Keep the Mac awake (system + display) while Claude is working.

Why: overnight Workflow runs and long build loops stalled when the Mac slept
(Giga, 2026-10-28). One `caffeinate -di -w <claude pid>` per session:

  UserPromptSubmit            start the hold (replacing any timed one)
  PostToolUse                 a background job was launched (Workflow, Agent, Bash
                              run_in_background): pin the session for PIN_SECS
  Stop / StopFailure          release, unless pinned: then re-hold with -t <time left>
                              so the background job keeps the Mac awake, but not forever
  SessionEnd                  release

`-w` ties the hold to the Claude process, so a crashed or killed session never
leaves the Mac caffeinated. Idle open sessions let the Mac sleep as normal.
Off switch: GIGABRAIN_AWAKE=0. Pin length: GIGABRAIN_AWAKE_PIN_HOURS (default 4).
Never blocks, never prints (always exit 0). macOS only; elsewhere a no-op.
Test: bin/kit selftest (awake cases), or by hand:
  echo '{"hook_event_name":"UserPromptSubmit","session_id":"s"}' | python3 awake.py; pmset -g assertions | grep caffeinate
"""
import json, os, pathlib, shutil, signal, subprocess, sys, time

STATE_DIR = pathlib.Path(os.environ.get("XDG_RUNTIME_DIR") or "/tmp") / f"gigabrain-awake-{os.getuid()}"
PIN_SECS = int(float(os.environ.get("GIGABRAIN_AWAKE_PIN_HOURS") or 4) * 3600)
BACKGROUND_TOOLS = {"Workflow", "Agent", "Task"}


def claude_pid():
    """The Claude process this hook runs under: hooks are spawned as claude -> sh -> python."""
    if os.environ.get("GIGABRAIN_AWAKE_PID"):  # selftest: bind to a throwaway process
        return int(os.environ["GIGABRAIN_AWAKE_PID"])
    pid = os.getppid()
    for _ in range(6):
        out = subprocess.run(["ps", "-o", "ppid=,comm=", "-p", str(pid)], capture_output=True, text=True).stdout.strip()
        if not out:
            break
        ppid, comm = out.split(None, 1)
        if os.path.basename(comm) == "claude":
            return pid
        pid = int(ppid)
    return os.getppid()


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ValueError):
        return False


def held(pidfile):
    try:
        pid = int(pidfile.read_text())
    except (OSError, ValueError):
        return None
    return pid if alive(pid) else None


def hold(pidfile, secs=None):
    args = ["caffeinate", "-di", "-w", str(claude_pid())] + (["-t", str(secs)] if secs else [])
    p = subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         start_new_session=True)  # outlives this hook; -w/-t end it
    pidfile.write_text(str(p.pid))


def release(pidfile):
    pid = held(pidfile)
    if pid:
        os.kill(pid, signal.SIGTERM)
    pidfile.unlink(missing_ok=True)


def background_launch(inp):
    tool = inp.get("tool_name", "")
    return tool in BACKGROUND_TOOLS or (tool == "Bash" and (inp.get("tool_input") or {}).get("run_in_background"))


def main():
    if os.environ.get("GIGABRAIN_AWAKE") == "0" or not shutil.which("caffeinate"):
        return
    inp = json.load(sys.stdin)
    event, sid = inp.get("hook_event_name", ""), inp.get("session_id") or "nosession"
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    pidfile, pinfile = STATE_DIR / f"{sid}.pid", STATE_DIR / f"{sid}.pin"
    if event == "UserPromptSubmit":  # always a fresh, untimed hold: a pinned one left over may carry -t
        release(pidfile)
        hold(pidfile)
    elif event == "PostToolUse":
        if background_launch(inp):
            pinfile.write_text(str(int(time.time())))
            if not held(pidfile):
                hold(pidfile)
    elif event in ("Stop", "StopFailure"):
        try:
            left = PIN_SECS - (time.time() - int(pinfile.read_text()))
        except (OSError, ValueError):
            left = 0
        release(pidfile)
        if left > 60:
            hold(pidfile, int(left))
        else:
            pinfile.unlink(missing_ok=True)
    elif event == "SessionEnd":
        release(pidfile)
        pinfile.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass  # a sleep helper must never break a session
    sys.exit(0)
