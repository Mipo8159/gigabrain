---
name: checklist-types
description: Reviewer checklist for type design — loaded by the reviewer agent when the diff adds or changes types, DTOs, entities, domain models or schemas (TS interfaces/classes, Python dataclasses/pydantic models, Go structs).
metadata:
  type: library
  source: ecc
  upstream: [agents/type-design-analyzer.md]
  upstream_sha: ef648e01
  absorbed: 2026-10-03
---
# Type design review checklist

Applies when: the diff adds or changes a type that carries domain meaning: TS
`interface`/`type`/`class`/`enum`, Nest DTOs and entities, Zod/class-validator
schemas, Python dataclasses / pydantic / TypedDict, Go structs and their
constructors, OpenAPI/JSON schemas.

The question for every changed type: **can a caller build or reach a state the
domain says is impossible?** Judge four things: encapsulation (can invariants be
broken from outside), invariant expression (does the type encode the rule),
usefulness (does the rule prevent a real bug), enforcement (is it enforced by the
type system or by hope).

## Blockers

- **Impossible combinations representable**: a bag of optional fields or
  booleans where only some combinations are valid (`status: "paid"` with
  `paidAt: undefined`; `isLoading && error && data`) → code downstream handles
  states that should not exist, or crashes on them. Prefer a discriminated union
  (TS), a tagged union / separate models (pydantic `Literal` discriminator), or
  distinct types (Go).
- **Invariant enforced only at one call site**: validation lives in a
  controller while the entity/model can be constructed anywhere unvalidated
  → the next caller skips it. Put it in the constructor / factory / schema.
- **Escape hatch on a domain type**: `any`, `as` casts, `# type: ignore`,
  `interface{}`/`any` in Go, or a non-null assertion (`!`) used to make a domain
  type compile → the type stops proving anything.
- **External input typed as trusted**: request bodies, queue messages, env vars
  or DB rows cast straight to a domain type without runtime validation → the
  type lies at the boundary.
- **Public mutable internals**: exported mutable fields/arrays on a type that
  owns an invariant (balance, state machine, collection size) → anyone can
  break it. Expose methods, readonly views, or copies.

## Should-fix

- **Primitive obsession on identifiers and units**: `string` for every ID, `number`
  for money/durations with no unit → IDs get swapped, cents vs units mixed up.
  Branded/opaque types (TS), `NewType` (Python), named types (Go).
- **Money as float**: use integer minor units or a decimal type.
- **Stringly-typed enums**: free `string` where a closed set exists (status,
  role, event type) → typos compile. Use a union / `Literal` / `enum` / Go const set,
  with an exhaustive switch (`never` check, `assert_never`, linter for Go).
- **Optional instead of "absent vs unknown vs empty"**: one `?` covering three
  meanings → callers guess. Model the cases explicitly when they behave differently.
- **DTO = entity**: the persistence entity is returned by the API or accepted
  as input → internal fields leak and mass-assignment opens up. Separate request
  DTO, response DTO and entity.
- **Wide input types**: functions accept a whole entity when they use two
  fields → harder to call correctly and to test. Accept the narrow shape.
- **Constructor that can fail silently**: returns a half-built object or
  zero-value struct on bad input instead of an error/`Result`/exception.
- **Go zero values**: a struct whose zero value is invalid but is usable
  without its `New…` constructor → document it or make the zero value safe.

## Nits

- A type name that doesn't say what it holds (`Data`, `Info`, `Payload2`).
- Duplicate near-identical types that drift apart; derive one from the other
  (`Pick`/`Omit`, pydantic inheritance) when they must stay in sync.

## Not this checklist's job

- Language-specific safety (`any` leaks in general, floating promises):
  `typescript.md`, `python.md`, `go.md`.
- Schema and migration correctness: `database.md`. API contract drift between
  services: the `contract-first` skill.
