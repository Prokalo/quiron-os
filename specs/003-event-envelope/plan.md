# Plan 003 — Event Envelope

**Status:** Draft  
**Spec:** ./spec.md

## 1. Technical Approach

Implement V1 as a small, independently owned `layer:infrastructure` TypeScript package. Its public root exposes an envelope type and functions to create, validate, serialize, and deserialize events. Use `globalThis.crypto.randomUUID()` for UUID v4 generation and standard JSON APIs for transport. Validate at every creation and deserialization boundary. Reconstructing, reusing, serializing, or deserializing an existing event preserves its ID. Delivery and domain payload rules remain outside this unit.

## 2. Architecture & Boundaries

**Approved architecture decision:** add a seventh production project at `packages/event-envelope`, named `event-envelope`, with npm package `@quiron/event-envelope` and the existing `layer:infrastructure` classification. It owns the shared contract and `packages/event-envelope/dist/`. It may depend on infrastructure packages only. Modules and applications may import its public root. It cannot import a module, application, or broker. The existing six projects retain their ownership and outputs.

The current six-project preflight is an explicit allowlist. Implementation must update it, the boundary matrix, npm workspaces, and the lockfile for seven projects while preserving every existing Nx layer, public-root, import, and output boundary.

## 3. Data Structures & Interfaces

The V1 JSON object has exactly six required keys: `eventId`, `eventType`, `sourceDomain`, `occurredAt`, `payload`, and `schemaVersion`. It may have `correlationId` and `causationId`. `schemaVersion` is the literal number `1` and versions the full envelope. `payload` is a JSON object, including `{}`, with recursively JSON-compatible values. Absent optional IDs stay omitted. Reject unknown top-level keys so future metadata needs an explicit version decision.

Proposed public API: `EventEnvelopeV1` (readonly shape), `createEventEnvelope(input)`, `validateEventEnvelope(value: unknown)`, `serializeEventEnvelope(value)`, `deserializeEventEnvelope(json: string)`, and `EventEnvelopeValidationError` with a stable field or error code. Creation input supplies type, domain, payload, and optional occurrence time and tracing IDs. Creation supplies the ID and defaults the timestamp to current UTC. Parsing accepts the existing ID and timestamp. Runtime validation remains authoritative for TypeScript callers.

## 4. Implementation Design

Creation checks caller fields, creates `<sourceDomain>-<UUID>` using `globalThis.crypto.randomUUID()`, assigns version and timestamp, and validates the complete result. Deserialization parses JSON and validates the resulting unknown value without generating an ID. Serialization validates before `JSON.stringify` and rejects values JSON would omit or coerce: `undefined`, functions, symbols, non-finite numbers, bigint, cycles, sparse arrays, and non-plain payload objects. Nested arrays and plain objects are allowed.

Validate `sourceDomain` against `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$`. The current domain/project names `core`, `ambassadors`, `tasks-agenda`, and `seguros-marketing-leads` all satisfy it. Validate the ID's UUID v4 suffix and require its preceding prefix to equal `sourceDomain`; the grammar permits hyphens within the domain. Require a nonempty event type. Verify `occurredAt` is a real ISO 8601 date-time with `Z` or an explicit numeric offset, preserving the supplied string. Optional tracing IDs must be nonempty strings when present; the spec imposes no UUID format on them.

## 5. Dependencies & Integration

Reuse the existing TypeScript, Node 22, npm workspace, Nx target, native `node:test`, and ESLint patterns. No third-party dependency or runtime alias is needed. Extend the API's compiled consumer fixture to import `@quiron/event-envelope` after its build, proving native package linking and public-root access. This adds no production domain or API behavior.

## 6. Expected Changes

- Create `packages/event-envelope/{project.json,package.json,tsconfig.json,tsconfig.lib.json,src/index.ts,test/*.test.mjs}` and a project ESLint config if required.
- Update root `package.json` workspaces and `package-lock.json`.
- Update `tools/check-projects.mjs` and `tools/check-module-boundaries.mjs` for seven projects, layer direction, real targets, public root, and disjoint outputs.
- Extend the API compiled consumer fixture and its test. Adjust workspace lint configuration only if new-project discovery requires it.
- After implementation, update `docs/architecture.md` and maintain this spec's `handoff.md`.

## 7. Failure Handling & Security

Invalid creation, validation, serialization, and deserialization fail with an identifiable validation error before returning an envelope or JSON. Errors identify the field and defect category without echoing values, payloads, or input JSON. Malformed JSON, unsupported versions, unknown top-level keys, mismatched ID prefixes, invalid timestamps, and incompatible payloads fail clearly.

## 8. Testing & Verification

Use native `node:test` against built package exports. Cover unit behavior for creation and round trips; boundaries below, at, and above version and value limits; negative cases for each required field and malformed JSON; integration via the compiled API consumer fixture; regression for ID preservation, empty payload, omitted optional IDs, and nested data. Test simultaneous creation for distinct IDs without relying on timestamps. Check errors for sensitive-value leakage.

Run relevant negative controls and mutations in disposable copies, including removed validation branches, changed version constant, and inverted prefix comparison. Every meaningful mutant must make a behavior test fail. Restore, then run `npm run check` with Node 22. Report actual results and failures in `handoff.md`; the gate must execute real tests for the seventh project.

## 9. Decisions & Risks

The seventh infrastructure project, `globalThis.crypto.randomUUID()`, domain-prefixed IDs, exact V1 top-level fields, and `sourceDomain` grammar are approved decisions, not yet implemented. All four current module names satisfy the grammar; its dot form is allowed for future domain names but is not used by those names. Timestamp checks must verify calendar validity without changing valid strings. Serialization must detect values that `JSON.stringify` silently discards or transforms. The graph report came from `ecd98764`; direct repository inspection governs paths and tooling.

## 10. Requirement Coverage

| Requirements | Design and verification |
| --- | --- |
| FR-1–FR-4; AS-1, AS-5; EC-3, EC-4, EC-7 | Creation, UUID prefix and timestamp checks; uniqueness and reconstruction tests. |
| FR-5–FR-7; AS-6; EC-1, EC-5 | Payload, version, and optional metadata validation; empty and invalid payload tests. |
| FR-8–FR-10; AS-2, AS-3; EC-2, EC-6 | Full validation at each boundary; round-trip and malformed-input tests. |
| NFR-1–NFR-3, NFR-5 | Public infrastructure contract, V1 shape, unsupported-version rejection, compiled consumer integration. |
| NFR-4; AS-4 | Field-level errors and sensitive-value leakage tests. |
