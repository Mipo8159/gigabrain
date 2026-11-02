---
name: gh-fix-ci
description: "Debug failing GitHub Actions checks on a PR: use gh and the bundled read-only script to pull failing checks and log snippets, summarise the root cause, propose a fix plan, implement only after approval, and leave the fix uncommitted. Use when the user says \"CI is red\", \"why is the build failing on my PR\", \"fix the failing checks\", or pastes a failing Actions run. External CI (CircleCI, Buildkite) is out of scope: report its URL only."
metadata:
  type: library
  source: openai-skills
  upstream: skills/.curated/gh-fix-ci
  upstream_sha: 49f948fa
  absorbed: 2026-11-02
---

# Gh Pr Checks Plan Fix

## Overview

Use gh to locate failing PR checks, fetch GitHub Actions logs for actionable failures, summarize the failure snippet, then propose a fix plan and implement after explicit approval.
- Draft the plan inline (or in plan mode for a multi-file fix) and request approval before implementing.

Prereq: authenticate with the standard GitHub CLI once (for example, run `gh auth login`), then confirm with `gh auth status` (repo + workflow scopes are typically required).

## Inputs

- `repo`: path inside the repo (default `.`)
- `pr`: PR number or URL (optional; defaults to current branch PR)
- `gh` authentication for the repo host

## Quick start

- `python3 "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>"`
- Add `--json` if you want machine-friendly output for summarization.

## Workflow

1. Verify gh authentication.
   - Run `gh auth status` in the repo.
   - If unauthenticated, ask the user to run `gh auth login` (ensuring repo + workflow scopes) before proceeding.
2. Resolve the PR.
   - Prefer the current branch PR: `gh pr view --json number,url`.
   - If the user provides a PR number or URL, use that directly.
3. Inspect failing checks (GitHub Actions only).
   - Preferred: run the bundled script (handles gh field drift and job-log fallbacks):
     - `python3 "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "<number-or-url>"`
     - Add `--json` for machine-friendly output.
   - Manual fallback:
     - `gh pr checks <pr> --json name,state,bucket,link,startedAt,completedAt,workflow`
       - If a field is rejected, rerun with the available fields reported by `gh`.
     - For each failing check, extract the run id from `detailsUrl` and run:
       - `gh run view <run_id> --json name,workflowName,conclusion,status,url,event,headBranch,headSha`
       - `gh run view <run_id> --log`
     - If the run log says it is still in progress, fetch job logs directly:
       - `gh api "/repos/<owner>/<repo>/actions/jobs/<job_id>/logs" > "<path>"`
4. Scope non-GitHub Actions checks.
   - If `detailsUrl` is not a GitHub Actions run, label it as external and only report the URL.
   - Do not attempt Buildkite or other providers; keep the workflow lean.
5. Summarize failures for the user.
   - Provide the failing check name, run URL (if any), and a concise log snippet.
   - Call out missing logs explicitly.
6. Create a plan.
   - Draft a concise plan (root cause, smallest fix, how it will be proven) and request approval. Reproduce the failure locally first when the repo has a local copy of the CI steps (for example `tests/test.sh`).
7. Implement after approval.
   - Apply the approved plan, run the failing step locally, and summarize diffs and test results. Leave the changes in the working tree: never commit, push or re-run CI without the user's explicit OK (a push can trigger deploys).
8. Recheck status.
   - Once the user has pushed, re-run the script or `gh pr checks` to confirm green. Report "plausible" until that rerun passes.

## Bundled Resources

### scripts/inspect_pr_checks.py

Fetch failing PR checks, pull GitHub Actions logs, and extract a failure snippet. Exits non-zero when failures remain so it can be used in automation.

Usage examples:
- `python3 "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "123"`
- `python3 "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --pr "https://github.com/org/repo/pull/123" --json`
- `python3 "<path-to-skill>/scripts/inspect_pr_checks.py" --repo "." --max-lines 200 --context 40`
