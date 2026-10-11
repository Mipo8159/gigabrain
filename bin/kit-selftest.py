#!/usr/bin/env python3
"""Regression tests for the kit, the guard hook and the installer merge.

    bin/kit selftest        (or: python3 bin/kit-selftest.py)

Everything runs in a temp dir with a temp registry and hook state; nothing in
~/.claude, gigaforge's kit/projects.json or any real repo is touched. Each case
here was a real bug or a decision worth pinning (see the comments).
Exit 1 on any failure.
"""
import json, os, pathlib, subprocess, sys, tempfile

G = pathlib.Path(__file__).resolve().parent.parent
TMP = pathlib.Path(tempfile.mkdtemp(prefix="gf-selftest-", dir=os.environ.get("TMPDIR")))
ENV = {**os.environ, "GIGAFORGE_KIT_REGISTRY": str(TMP / "projects.json"), "XDG_RUNTIME_DIR": str(TMP / "rt"),
       "GIGAFORGE_MEMORY_ROOT": str(TMP / "memory"), "TMPDIR": str(TMP),
       "GIGAFORGE_HOOK_PROFILE": "", "GIGAFORGE_DISABLED_HOOKS": ""}
(TMP / "rt").mkdir()
fails = []


def check(name, cond):
    print(("ok   " if cond else "FAIL ") + name)
    if not cond:
        fails.append(name)


def guard(event, session="s", **kw):
    inp = {"hook_event_name": event, "session_id": session, "cwd": str(TMP), **kw}
    r = subprocess.run([sys.executable, str(G / "global/hooks/guard.py")], input=json.dumps(inp),
                       capture_output=True, text=True, env=ENV, timeout=20)
    return r.stdout


def bash_decision(cmd, session="s"):
    out = guard("PreToolUse", session, tool_name="Bash", tool_input={"command": cmd})
    return "deny" if '"deny"' in out else "ask" if '"ask"' in out else "allow"


def kit(*args):
    return subprocess.run([sys.executable, str(G / "bin/kit"), *args], capture_output=True, text=True, env=ENV)


def guard_cases():
    table = [
        ("deny", "git commit --no-verify -m x"), ("deny", "git commit -nm wip"), ("deny", "HUSKY=0 git commit -m x"),
        ("deny", "git -c core.hooksPath=/dev/null commit -m x"), ("deny", "git config core.hooksPath /dev/null"),
        # 2026-10-03: reading or setting a real hooks path is setup, not a bypass (install.sh does it)
        ("allow", "git config --get core.hooksPath"), ("allow", "git config core.hooksPath .githooks"),
        ("allow", "git push -n origin main"), ("allow", 'git commit -m "docs: mention --no-verify"'),
        # destructive → "ask": a human confirms; the model can't approve itself (review 2026-10-03, #6)
        ("ask", "rm -rf src"), ("allow", "rm -rf node_modules dist"), ("ask", "git reset --hard HEAD~1"),
        ("ask", "git push --force origin main"), ("allow", "git push origin feature"),
        ("ask", 'psql -c "DROP TABLE users"'), ("ask", 'docker exec db psql -c "truncate orders"'),
        ("ask", 'psql -c "delete from users;"'), ("allow", 'psql -c "delete from users where id=1;"'),
        # 2026-10-03: SQL words outside a DB client (echo, commit message) are not a database call
        ("allow", 'echo "drop table is sql"'), ("allow", 'git commit -m "fix: delete from cart;"'),
        ("ask", "kubectl delete pod api"), ("allow", "kubectl get pods"), ("ask", "terraform destroy"),
        ("ask", "aws s3 rm s3://b --recursive"), ("allow", "aws s3 ls"), ("ask", "docker compose down -v"),
        ("allow", "docker compose down"), ("ask", "redis-cli FLUSHALL"), ("allow", "npm test && git status"),
        # review #1: a safe rm at the end must not exempt the whole command
        ("ask", "git reset --hard origin/main && rm -rf node_modules"), ("ask", "kubectl delete ns prod; rm -rf .cache"),
        ("allow", "rm -rf dist && npm run build"), ("allow", "rm -rf node_modules package-lock.json && npm i"),
        # review #3: global options before the verb
        ("ask", "git -C /repo reset --hard"), ("ask", "git -C /repo clean -fdx"), ("ask", "git -C /r push --force"),
        ("ask", "kubectl -n prod delete pod x"), ("ask", "kubectl --context prod delete deploy api"),
        ("ask", "helm -n prod uninstall api"), ("ask", "docker compose -f x.yml down -v"), ("ask", "docker-compose down -v"),
        ("ask", "aws --profile prod s3 rm s3://b/k --recursive"), ("ask", "aws --profile prod ec2 terminate-instances --instance-ids i-1"),
        ("ask", "terraform -chdir=infra destroy"),
        # review #4: stack-specific destructive commands and wrappers
        ("ask", "npx prisma migrate reset --force"), ("ask", "prisma db push --force-reset"),
        ("ask", "npm run typeorm -- schema:drop"), ("ask", "dropdb app"), ("ask", 'mongosh --eval "db.dropDatabase()"'),
        ("ask", 'psql -c "DELETE FROM public.users;"'), ("ask", "psql -c 'DELETE FROM \"users\";'"),
        ("ask", "aws s3 sync ./out s3://b --delete"), ("ask", "git push origin --delete feature"),
        ("ask", "docker rm -f $(docker ps -aq)"), ("ask", "gh repo delete me/x --yes"),
        ("ask", 'bash -c "rm -rf /var/lib/app"'), ("ask", "ssh host 'sudo rm -rf /data'"),
        ("ask", "rm -r src"), ("ask", "rm --force --recursive src"), ("ask", "sudo -u app rm -rf /srv/app"),
        ("allow", "rm -rf /tmp/claude-1000/scratch/x"),
        # review #5: these are not hook bypasses
        ("allow", 'git commit -m "fix"\ngit log --oneline -n 3'), ("allow", "git log --grep=commit -n 5"),
        ("allow", 'git commit -m "chore: delete unused -n flag"'), ("allow", "HUSKY=0 npm ci"),
        ("allow", "grep -rn HUSKY=0 ."), ("deny", 'git commit -m "x" -n'), ("deny", "SKIP_HOOKS=1 git commit -m x"),
        ("deny", 'bash -c "git commit --no-verify -m x"'),
        # second review 2026-10-03, blocker: an apostrophe in a comment/heredoc hid later commands
        ("ask", "# don't keep stale build\nrm -rf src"), ("ask", "# we don't need local\ngit reset --hard origin/main"),
        ("ask", "echo don\\'t && rm -rf src"), ("ask", "cat > n.md <<'EOF'\nit's done\nEOF\nrm -rf src"),
        ("ask", "echo 'unterminated && rm -rf src"),  # unparseable quoting fails closed
        # wrappers with flag clusters / value options / --
        ("ask", 'bash -lc "rm -rf src"'), ("ask", 'bash -euc "rm -rf src"'),
        ("ask", "ssh -i key.pem ubuntu@host 'rm -rf /srv/app'"), ("ask", "ssh -o StrictHostKeyChecking=no h 'rm -rf /srv'"),
        ("ask", "aws-vault exec prod -- aws s3 rm s3://b --recursive"), ("ask", "dotenv -e .env.prod -- npx prisma migrate reset"),
        # grouping, keywords, substitutions
        ("ask", "(rm -rf src)"), ("ask", "{ rm -rf src; }"), ("ask", "if true; then rm -rf src; fi"),
        ("ask", "for d in a b; do rm -rf $d; done"), ("ask", "x=$(rm -rf src)"), ("ask", "echo `rm -rf src`"),
        ("ask", 'echo "$(git reset --hard)"'),
        # absolute paths are never "safe build dirs"
        ("ask", "rm -rf /tmp"), ("ask", "rm -rf /build"), ("ask", "rm -rf ~/out"), ("ask", "rm -rf ../dist"),
        # more stack commands
        ("ask", "pnpm prisma migrate reset --force"), ("ask", "pnpm dlx prisma migrate reset"), ("ask", "yarn prisma migrate reset"),
        ("ask", "npm exec prisma migrate reset"), ("ask", "npx prisma db push --accept-data-loss"),
        ("ask", "npx knex migrate:rollback --all"), ("ask", "python manage.py flush --noinput"), ("ask", "./manage.py reset_db"),
        ("ask", "alembic downgrade base"), ("ask", "tofu destroy"), ("ask", "terragrunt destroy"), ("ask", "pulumi destroy --yes"),
        ("ask", "terraform state rm aws_db.main"), ("ask", "terraform workspace delete prod"),
        ("ask", 'mongosh app --eval "db.users.drop()"'), ("ask", 'mongosh app --eval "db.users.deleteMany({})"'),
        ("ask", "git checkout -f main"), ("ask", "git switch -f main"), ("ask", "docker compose rm -fsv"),
        ("ask", "aws ecr batch-delete-image --repository-name r --image-ids imageTag=x"),
        # routine cleanups must not ask
        ("allow", "rm -rf .venv"), ("allow", "rm -rf .mypy_cache .ruff_cache"), ("allow", "rm -rf *.egg-info"),
        ("allow", "rm -rf .terraform"), ("allow", "rm -rf bin obj"), ("allow", "rm -rf $TMPDIR/foo/bar"),
        ("allow", "find . -type d -name __pycache__ -exec rm -rf {} +"), ("allow", 'find . -name "*.log" -mtime +7 -delete'),
        ("allow", "git restore --staged ."), ("allow", "kubectl delete --help"),
        ("allow", "cat <<'EOF'\nrm -rf src\ngit reset --hard\nEOF"), ("allow", "ls 2>&1 | tee out.txt"),
        ("allow", 'git commit -m "$(cat <<\'EOF\'\nfeat: x\n\nrm -rf old dirs\nEOF\n)"'),
        # no-verify variants
        ("deny", "export HUSKY=0; git commit -m x"), ("deny", "HUSKY_SKIP_HOOKS=1 git commit -m x"),
        ("deny", "git commit --no-veri -m x"), ("deny", "git config core.hooksPath /tmp/empty && git commit -m x"),
        ("deny", "GIT_CONFIG_PARAMETERS=\"'core.hooksPath=/dev/null'\" git commit -m x"),
    ]
    for i, (want, cmd) in enumerate(table):
        got = bash_decision(cmd, session=f"t{i}")
        check(f"guard {want:<5} {cmd!r}" + ("" if got == want else f"  (got {got})"), got == want)
    import time as _t
    t0 = _t.time()
    big = bash_decision("echo " + "x" * 1_000_000, "big")
    check(f"guard: 1 MB command fails closed fast ({_t.time() - t0:.2f}s < 2s)", big == "ask" and _t.time() - t0 < 2)
    check("guard ask is stateless: retry asks again", bash_decision("kubectl delete ns x", "r1") == "ask"
          and bash_decision("kubectl delete ns x", "r1") == "ask")
    bad = TMP / "badreq-guard"
    (bad / ".claude").mkdir(parents=True)
    (bad / ".claude/gigaforge.json").write_text('["not", "an", "object"]')
    r = subprocess.run([sys.executable, str(G / "global/hooks/guard.py")], capture_output=True, text=True, timeout=20,
                       env=ENV, input=json.dumps({"hook_event_name": "PreToolUse", "session_id": "b", "cwd": str(bad),
                                                  "tool_name": "Bash", "tool_input": {"command": "git reset --hard"}}))
    check("guard: non-object gigaforge.json keeps the guard on (review #13)", r.returncode == 0 and '"ask"' in r.stdout)
    cfg = TMP / "eslint.config.mjs"
    cfg.write_text("export default []\n")
    edit = lambda s, prof="": json.loads(subprocess.run(
        [sys.executable, str(G / "global/hooks/guard.py")], capture_output=True, text=True, timeout=20,
        input=json.dumps({"hook_event_name": "PreToolUse", "session_id": s, "cwd": str(TMP), "tool_name": "Edit",
                          "tool_input": {"file_path": str(cfg)}}), env={**ENV, "GIGAFORGE_HOOK_PROFILE": prof}).stdout or "{}")
    check("config-protect: existing lint config denied (standard)", "hookSpecificOutput" in edit("c1"))
    check("config-protect: off in minimal profile", edit("c2", "minimal") == {})
    out = guard("PreToolUse", "c3", tool_name="Write", tool_input={"file_path": str(TMP / "new" / ".prettierrc")})
    check("config-protect: creating a new config allowed", out == "")
    r = subprocess.run([sys.executable, str(G / "global/hooks/guard.py")], input="not json", capture_output=True,
                       text=True, env=ENV, timeout=20)
    check("guard: garbage input exits 0 silently", r.returncode == 0 and r.stdout == "")
    off = subprocess.run([sys.executable, str(G / "global/hooks/guard.py")], capture_output=True, text=True, timeout=20,
                         input=json.dumps({"hook_event_name": "PreToolUse", "session_id": "d", "cwd": str(TMP),
                                           "tool_name": "Bash", "tool_input": {"command": "rm -rf src"}}),
                         env={**ENV, "GIGAFORGE_DISABLED_HOOKS": "destructive"})
    check("guard: GIGAFORGE_DISABLED_HOOKS switches a check off", off.stdout == "")


def handoff_cases():
    repo = TMP / "hrepo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    mem = TMP / "mem"
    mem.mkdir()
    (repo / ".claude").mkdir()
    (repo / ".claude/settings.local.json").write_text(json.dumps({"autoMemoryDirectory": str(mem)}))
    common = subprocess.run(["git", "-C", str(repo), "rev-parse", "--path-format=absolute", "--git-common-dir"],
                            capture_output=True, text=True).stdout.strip()
    (mem / "handoff.md").write_text(f"repo: {common}\n## Failed\n- SQS FIFO capped throughput\n")
    out = guard("SessionStart", cwd=str(repo))
    check("handoff: injected for the same repo, marked historical",
          "SQS FIFO" in out and "HISTORICAL REFERENCE ONLY" in out)
    (mem / "handoff.md").write_text("repo: /some/other/repo/.git\n## Failed\n- secret plan\n")
    check("handoff: another repo's handoff in a shared memory dir is NOT injected",
          guard("SessionStart", cwd=str(repo)) == "")


def kit_cases():
    repo = TMP / "app"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "package.json").write_text(json.dumps({"dependencies": {"@nestjs/core": "1", "pg": "8"},
                                                   "scripts": {"build": "nest build", "test": "jest", "deploy": "x"}}))
    (repo / "package-lock.json").write_text("{}")
    (repo / "Dockerfile").write_text("FROM node\n")
    d = json.loads(kit("detect", str(repo), "--json").stdout)
    check("detect: nest+postgres+docker", {"nest", "postgres", "docker"} <= set(d["stacks"]))
    check("detect: real commands from package.json", d["commands"].get("build") == "npm run build")
    check("detect: risky script found", [".", "deploy"] in [list(x) for x in d["risky_scripts"]])
    # 2026-10-03: unknown repos must not default to "own" (client memory would leak into gigaforge)
    r = kit("apply", str(repo))
    check("apply: unknown repo without --kind refuses", r.returncode != 0 and "--kind" in (r.stderr + r.stdout))
    dry = kit("apply", str(repo), "--kind", "own", "--memory", "selftest-mem", "--dry-run")
    check("apply --dry-run writes nothing", dry.returncode == 0 and not (repo / "CLAUDE.md").exists()
          and not (repo / ".claude").exists())
    local = repo / ".claude/settings.local.json"
    local.parent.mkdir(exist_ok=True)
    local.write_text(json.dumps({"permissions": {"ask": ["Bash(mine)"]}, "env": {"X": "1"}}))
    r = kit("apply", str(repo), "--kind", "own", "--memory", "selftest-mem")
    s = json.loads(local.read_text())
    check("apply: user keys and rules kept", s["env"] == {"X": "1"} and "Bash(mine)" in s["permissions"]["ask"])
    # 2026-10-03: pm-agnostic, so `npm --prefix api run deploy` / `yarn run deploy` also prompt
    check("apply: risky script → ask rule", "Bash(*run deploy*)" in s["permissions"]["ask"])
    check("apply: scaffold written with real commands", "`npm run build`" in (repo / "CLAUDE.md").read_text())
    before = local.read_text()
    kit("apply", str(repo))
    check("apply: idempotent (second apply changes nothing)", local.read_text() == before)
    req = json.loads((repo / ".claude/gigaforge.json").read_text())
    req["exclude_stacks"] = ["docker"]
    (repo / ".claude/gigaforge.json").write_text(json.dumps(req))
    kit("apply", str(repo))
    s = json.loads(local.read_text())
    check("exclude_stacks removes exactly that stack's rules",
          not any("docker" in a for a in s["permissions"]["ask"]) and "Bash(mine)" in s["permissions"]["ask"])
    doc = kit("doctor", str(repo))
    check("doctor: flags the untouched scaffold", "untouched scaffold" in doc.stdout)
    (repo / "CLAUDE.md").write_text((repo / "CLAUDE.md").read_text().replace("TODO", "done"))
    kit("remove", str(repo))
    s = json.loads(local.read_text())
    check("remove: only kit rules removed; user rule, env and edited CLAUDE.md kept",
          s["permissions"]["ask"] == ["Bash(mine)"] and s["env"] == {"X": "1"} and (repo / "CLAUDE.md").exists()
          and "autoMemoryDirectory" not in s)
    check("remove: kit files and registry entry gone", not (repo / ".claude/gigaforge.json").exists()
          and str(repo) not in json.loads((TMP / "projects.json").read_text())["projects"])
    excl = (repo / ".git/info/exclude").read_text()
    check("remove: .git/info/exclude cleaned", "gigaforge" not in excl)
    # client: memory never points into gigaforge
    crepo = TMP / "client"
    crepo.mkdir()
    subprocess.run(["git", "init", "-q", str(crepo)], check=True)
    (crepo / "package.json").write_text("{}")
    kit("apply", str(crepo), "--kind", "client")
    cs = json.loads((crepo / ".claude/settings.local.json").read_text())
    check("client: no autoMemoryDirectory into gigaforge", str(G) not in cs.get("autoMemoryDirectory", ""))
    check("client: scaffold git-excluded", "CLAUDE.md" in (crepo / ".git/info/exclude").read_text())
    # 2026-10-03: CLAUDE.md exclude survives re-apply bookkeeping (was recorded on first apply only)
    kit("apply", str(crepo))
    st = json.loads((crepo / ".claude/gigaforge.state.json").read_text())
    check("client: re-apply still records the CLAUDE.md exclude it added",
          "CLAUDE.md" in next(o["patterns"] for o in st["ops"] if o["kind"] == "exclude"))
    # 2026-10-03: own → client must drop kit's memory link into gigaforge
    srepo = TMP / "switch"
    srepo.mkdir()
    subprocess.run(["git", "init", "-q", str(srepo)], check=True)
    (srepo / "package.json").write_text("{}")
    kit("apply", str(srepo), "--kind", "own", "--memory", "selftest-mem")
    kit("apply", str(srepo), "--kind", "client")
    ss = json.loads((srepo / ".claude/settings.local.json").read_text())
    check("client switch: kit-owned memory link into gigaforge removed", str(G) not in ss.get("autoMemoryDirectory", ""))
    # 2026-10-03: a user's own exclude line identical to kit's must survive remove
    urepo = TMP / "userexcl"
    urepo.mkdir()
    subprocess.run(["git", "init", "-q", str(urepo)], check=True)
    (urepo / "package.json").write_text("{}")
    (urepo / ".git/info/exclude").write_text(".claude/settings.local.json\n")
    kit("apply", str(urepo), "--kind", "lab", "--memory", "selftest-mem")
    kit("remove", str(urepo))
    check("remove: user's pre-existing identical exclude line kept",
          ".claude/settings.local.json" in (urepo / ".git/info/exclude").read_text().splitlines())
    # 2026-10-03: in a worktree, excludes must go where git reads them (common dir), not .git/worktrees/<n>
    wmain = TMP / "wmain"
    wmain.mkdir()
    git = lambda *a: subprocess.run(["git", "-C", str(wmain), *a], capture_output=True, check=True)
    git("init", "-q")
    git("config", "user.email", "t@t")
    git("config", "user.name", "t")
    (wmain / "package.json").write_text("{}")
    git("add", ".")
    git("commit", "-qm", "init")
    wt = TMP / "wt"
    git("worktree", "add", "-q", str(wt))
    kit("apply", str(wt), "--kind", "client")
    status = subprocess.run(["git", "-C", str(wt), "status", "--porcelain"], capture_output=True, text=True).stdout
    check("worktree: kit files and client scaffold not untracked", ".claude" not in status and "CLAUDE.md" not in status)
    # 2026-10-03: pnpm runs scripts without "run", also with -F filters
    prepo = TMP / "pnpm"
    prepo.mkdir()
    (prepo / "package.json").write_text(json.dumps({"scripts": {"db:reset": "x", "build:prod": "y"}}))
    (prepo / "pnpm-lock.yaml").write_text("")
    kit("apply", str(prepo), "--kind", "lab", "--memory", "selftest-mem")
    ps = json.loads((prepo / ".claude/settings.local.json").read_text())["permissions"]["ask"]
    check("pnpm: risky script variant without 'run'", "Bash(*pnpm *db:reset*)" in ps and "Bash(*run db:reset*)" in ps)
    check("risky: build:prod is not risky (no bare 'prod')", not any("build:prod" in a for a in ps))
    # nits
    r = kit("apply", "--all", "--kind", "own")
    check("apply --all rejects --kind", r.returncode != 0)
    bad = TMP / "badreq-kit"
    (bad / ".claude").mkdir(parents=True)
    (bad / ".claude/gigaforge.json").write_text('["x"]')
    r = kit("apply", str(bad), "--kind", "lab")
    check("non-object gigaforge.json: clear error", r.returncode != 0 and "JSON object" in (r.stderr + r.stdout))
    r = subprocess.run([sys.executable, str(G / "bin/kit"), "detect", "--json"], capture_output=True, text=True,
                       env=ENV, cwd=str(prepo))
    check("detect --json without a path uses .", r.returncode == 0 and json.loads(r.stdout)["repo"] == str(prepo))
    (G / "memory" / "selftest-mem").exists() and (G / "memory" / "selftest-mem").rmdir()


def installer_cases():
    src = (G / "bin/install.sh").read_text()
    py = src.split('python3 - "$C/settings.json" "$G" <<\'EOF\'\n', 1)[1].split("\nEOF\n", 1)[0]
    (TMP / "step4.py").write_text(py)
    st = TMP / "settings.json"
    st.write_text(json.dumps({"permissions": {"allow": ["Read"]}, "model": "x"}))
    for _ in range(2):
        subprocess.run([sys.executable, str(TMP / "step4.py"), str(st), str(G)], capture_output=True, check=True)
    s = json.loads(st.read_text())
    cmds = [(ev, h["command"]) for ev, gs in s["hooks"].items() for g in gs for h in g["hooks"]]
    check("install: guard registered on 4 events", {ev for ev, c in cmds if "guard.py" in c}
          == {"PreToolUse", "PostToolUse", "SessionStart", "Stop"})
    check("install: merge idempotent (no duplicate hooks after 2 runs)", len(cmds) == len(set(cmds)))
    check("install: unrelated settings kept", s["model"] == "x" and "Read" in s["permissions"]["allow"])


if __name__ == "__main__":
    import shutil, traceback
    MEM_BEFORE = sorted(p.name for p in (G / "memory").iterdir())
    for case in (guard_cases, handoff_cases, kit_cases, installer_cases):
        try:
            case()
        except Exception:  # one broken case must not hide the others
            check(f"{case.__name__} crashed: {traceback.format_exc().strip().splitlines()[-1]}", False)
    # 2026-10-03: the selftest once created gigaforge/memory/app on every run
    check("selftest leaves gigaforge/memory untouched", sorted(p.name for p in (G / "memory").iterdir()) == MEM_BEFORE)
    shutil.rmtree(TMP, ignore_errors=True)
    print(f"selftest: {len(fails)} failure(s)" + (f": {fails}" if fails else ""))
    sys.exit(1 if fails else 0)
