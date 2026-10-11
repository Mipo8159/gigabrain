---
name: checklist-go
description: Reviewer checklist for Go diffs — loaded by the reviewer agent when the diff touches *.go, go.mod or go.sum.
metadata:
  type: library
  source: ecc
  upstream: [agents/go-reviewer.md, rules/golang/coding-style.md, rules/golang/patterns.md, rules/golang/security.md, rules/golang/testing.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Go review checklist

Applies when: `**/*.go`, `go.mod`, `go.sum`.
Useful read-only checks if installed: `go vet ./...`, `staticcheck ./...`, `golangci-lint run`,
`go test -race ./...`, `govulncheck ./...`, `gosec ./...`.

## Blockers

- Errors discarded with `_` (or an `err` that is assigned and never checked) → the failure is silently ignored.
- `panic` used for recoverable errors in library or request paths → the process crashes instead of returning an error.
- `err == target` comparisons instead of `errors.Is` / `errors.As` → breaks as soon as anything wraps the error.
- SQL built by string concatenation for `database/sql` → injection.
- Unvalidated input passed to `os/exec` → command injection.
- User-controlled paths without `filepath.Clean` plus a prefix check → path traversal.
- Shared state read or written from goroutines without synchronization → data race (`go test -race` catches it).
- `tls.Config{InsecureSkipVerify: true}` outside tests → MITM.
- Hardcoded secrets; config read from source instead of the environment, with no check that the value is set.
- `unsafe` used with no stated justification.

## Should-fix

- `return err` with no context. Wrap it: `fmt.Errorf("create user: %w", err)` (`%w`, not `%v`, so `errors.Is` keeps working).
- Goroutines with no cancellation path (no `context.Context`, no done channel) → goroutine leak.
- A send on an unbuffered channel that may have no receiver → deadlock.
- Goroutines fanned out with no `sync.WaitGroup` / errgroup → work lost or the caller returns early.
- `mu.Lock()` without `defer mu.Unlock()` on functions with multiple return paths.
- Outbound calls, DB queries or handlers without `context.WithTimeout` / deadlines. `defer cancel()` missing after `WithTimeout` / `WithCancel`.
- `ctx context.Context` not the first parameter.
- `defer` inside a loop (closes pile up until the function returns → fd or connection exhaustion).
- Queries inside a loop (N+1).
- Mutable package-level variables used as global state. Dependencies not injected through constructors.
- Interfaces defined on the implementer side, or large (more than ~3 methods), or with only one implementation and no consumer need. Returning interfaces where a concrete struct would do ("accept interfaces, return structs").
- `if/else` chains where an early return flattens the code. Functions over ~50 lines or nesting over 4 levels.
- New behaviour without a table-driven test. Concurrency changes not exercised under `-race`.

## Nits

- `strings.Builder` instead of `+=` in loops. Pre-allocate slices with `make([]T, 0, n)` when the size is known.
- Error strings: lowercase, no trailing punctuation.
- Package names: short, lowercase, no underscores.
- Code not gofmt/goimports-clean (should be enforced by tooling, not argued by hand).

## Not this checklist's job

- Swallowed errors and misleading fallbacks across languages: silent-failures.md.
- Schema, migration and query-plan review: database.md. Authn/authz and secret handling in depth: security.md.
