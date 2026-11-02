---
name: gh-address-comments
description: "Address review and conversation comments on the open GitHub PR for the current branch: fetch every thread with gh, number and summarise them, let the user pick, fix the picked ones, run tests and draft replies, then stop before any commit, push or posted reply. Use when the user says \"address the PR comments\", \"go through the review\", \"fix what the reviewer asked\", or pastes a PR with review feedback."
metadata:
  type: library
  source: openai-skills
  upstream: skills/.curated/gh-address-comments
  upstream_sha: 49f948fa
  absorbed: 2026-11-02
---

# PR Comment Handler

Guide to find the open PR for the current branch and address its comments with gh CLI.

Prereq: `gh auth status` must succeed (repo scope). If it fails, ask the user to run `! gh auth login`; never work around it.

## 1) Inspect comments needing attention
- Run `python3 <this skill's directory>/scripts/fetch_comments.py > <scratchpad>/pr_comments.json`. It is read-only: it prints every conversation comment, review and inline review thread (with resolved/outdated state) on the PR as JSON.
- Skip resolved and outdated threads unless the user asks for them.

## 2) Ask the user for clarification
- Number all the review threads and comments and provide a short summary of what would be required to apply a fix for it
- Ask the user which numbered comments should be addressed

## 3) If user chooses comments
- Apply fixes for the selected comments only. A comment you disagree with gets a reasoned reply draft instead of a change.

## 4) Draft replies, then stop
- Run the repo's tests for what changed and say what was verified.
- Draft one short reply per addressed thread (what changed, or why not), in the team's tone.
- Leave the changes in the working tree. Never commit, push, post a reply or resolve a thread without the user's explicit OK for that action; each is outward-facing.
- List the threads you did not address and why.

Notes:
- If gh hits auth/rate issues mid-run, prompt the user to re-authenticate with `gh auth login`, then retry.
