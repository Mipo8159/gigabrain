---
name: checklist-react
description: Reviewer checklist for React diffs — loaded by the reviewer agent when the diff touches .tsx/.jsx, components, hooks, Next.js app/ or pages/ routes, or "use client"/"use server" files.
metadata:
  type: library
  source: ecc
  upstream: [agents/react-reviewer.md, rules/react/coding-style.md, rules/react/hooks.md, rules/react/patterns.md, rules/react/security.md, rules/react/testing.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# React review checklist

Applies when: `*.tsx`, `*.jsx`, files importing `react`, `"use client"` /
`"use server"` files, Next.js `app/` or `pages/`. Load `typescript.md` alongside
for generic TS issues. Check that `eslint-plugin-react-hooks` (and ideally
`jsx-a11y`) is configured; if it isn't, that's a finding.

## Blockers

- **`dangerouslySetInnerHTML` with user-derived HTML** and no allowlist sanitizer
  (e.g. DOMPurify) at the same call site → stored/reflected XSS.
- **User URLs in `href`/`src`** with no scheme check → `javascript:`/`data:`
  executes code.
- **Secret in the client bundle**: private key/token in `NEXT_PUBLIC_*`, `VITE_*`,
  `REACT_APP_*`, or any env var read by a client-imported module → shipped to every
  browser.
- **Session token in `localStorage`/`sessionStorage`** → readable by any XSS. Use
  httpOnly secure cookies.
- **Server Action (`"use server"`) without schema validation, authentication
  inside the action, and a per-record authorization check** → it is a public
  endpoint; a client-side route gate doesn't protect it.
- **UI-only gating of sensitive actions** (hidden button, no API check) → render
  gating hides, it does not deny.
- **Conditional hook calls** (inside `if`/loop/`&&`/ternary/after early return) or
  hooks outside a component/custom hook → hook order breaks; state attaches to the
  wrong hook.
- **Direct state mutation** (`state.push(x)`, `obj.a = 1; setObj(obj)`) → no
  re-render; memoized children see `===` and skip.

## Should-fix

- **Incomplete dependency arrays** in `useEffect`/`useMemo`/`useCallback`, or
  `eslint-disable … exhaustive-deps` without a justification comment → stale values.
- **Effect for derived state** (`useEffect(() => setX(f(props.y)), [props.y])`) or
  effect chains that set state that triggers another effect → compute during
  render instead.
- **Effect without cleanup**: subscriptions, intervals, listeners, `fetch` without
  `AbortController` → leaks, setState after unmount, races.
- **Stale closure** in async handlers/intervals → use a functional updater
  (`setN(n => n + 1)`) or a ref.
- **`ref.current` read/written during render** → inconsistent output.
- **Server/Client boundary leaks**: a `"use client"` file importing a
  `server-only`/DB/secret-bearing module; `"use client"` placed above a large tree
  that doesn't need it; a server component passing full records (hashes, tokens)
  as props to a client component.
- **`key={index}` on lists that reorder/insert/delete** → child state attaches to
  the wrong row. Keys must be stable and unique among siblings.
- **State initialised from a prop with no `key` reset** → doesn't update when the
  prop changes.
- **Duplicated or derivable state** kept in `useState`.
- **`fetch` in `useEffect` for real data loading** → races, no cache/retry; prefer
  RSC fetch, TanStack Query or SWR as the repo already does.
- **Missing error boundary** around async/data-fetching subtrees.
- **Accessibility**: `<div onClick>` instead of `<button>`; inputs without a label
  or `aria-label(ledby)`; `<img>` without `alt` (`alt=""` if decorative); ARIA
  overriding native semantics; disclosure widgets without `aria-expanded`/
  `aria-controls`; skipped heading levels; colour as the only error signal.
- **`target="_blank"` without `rel="noopener noreferrer"`.**
- **Forms**: no `<form>` element; `onSubmit` without `preventDefault()` (unless
  React 19 form actions); inputs without `name`.
- **Cookie auth without CSRF protection** (token or `SameSite` cookies).
- **New UI library that renders HTML strings internally** (rich-text editors etc.)
  → same XSS rules apply to its props.

## Performance (flag only when it matters)

- New object/function passed inline to a `React.memo` child → memo defeated.
- Heavy sync work (parse/sort/regex) in render with no `useMemo`; conversely
  `useMemo`/`useCallback` with no consumer that benefits.
- High-frequency values in Context → every consumer re-renders.
- Long lists (50+ non-trivial rows) without virtualization.
- One Suspense boundary at the route root instead of near the data.

## Tests in the diff

- Queries by role/label/text first; `data-testid` last; no `container.querySelector`.
- `await` every `userEvent` call; `findBy*`/`waitFor` for async, never `setTimeout`.
- No assertions on internal state, render counts, or mocked React hooks; ignored
  `act()` warnings are real bugs.

## Not this checklist's job

- Generic TS type safety and async correctness → `typescript.md`.
- Backend authz, secrets, cloud config → `security.md`.
