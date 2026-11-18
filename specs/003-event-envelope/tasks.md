# 003 — Event Envelope · Tasks

**Status:** Draft | **Plan:** ./plan.md

Complete one approved task at a time. After each implementation unit, update `handoff.md` and stop for review and commit approval as required by `AGENTS.md`. All paths and checks below refer to the current checkout.

## Implementation

- [x] **T01 — Register the infrastructure project and its checks.** Add `packages/event-envelope` with `layer:infrastructure`, a public-root-only npm package, TypeScript build and declarations, real lint/typecheck/build/test targets, and project-owned output. Add the npm workspace and lockfile entry. Update the project preflight and boundary matrix to recognize seven projects without loosening existing rules; include a meaningful architecture test for the new package. **Covers:** NFR-1, NFR-2. **Evidence:** `npm run check:projects` finds exactly seven projects and disjoint outputs; `npm run check:boundaries` checks the new layer direction and public root.
- [x] **T02 — Define the V1 contract and creation API.** Export the six required fields, two optional IDs, full-envelope version `1`, and creation API. Generate `<sourceDomain>-<UUID>` with `globalThis.crypto.randomUUID()`; keep reconstruction separate from creation. **Covers:** FR-1–FR-7; AS-1, AS-5, AS-6; EC-4, EC-7. **Evidence:** built-package unit tests check UUID v4 format, distinct concurrent IDs, field presence, empty payload, and omitted optional IDs.
- [x] **T03 — Validate envelope shape and metadata.** Validate required and optional field types, reject unknown top-level keys and unsupported versions, enforce `^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$` for `sourceDomain`, match the ID prefix and UUID v4 suffix, and check a real ISO 8601 timestamp with explicit offset. Return no partial envelope. **Covers:** FR-1–FR-4, FR-6–FR-9; AS-1, AS-3; EC-1, EC-3, EC-6; NFR-5. **Evidence:** unit, boundary, and negative tests for each field, domain grammar, version `0/1/2`, UUID mismatch, and invalid dates/offsets.
- [x] **T04 — Validate payload and serialize safely.** Accept `{}` and nested JSON-compatible data; reject unsupported values before JSON can silently omit or coerce them. Expose identifiable errors without raw payload or sensitive values. **Covers:** FR-5, FR-8, FR-9; AS-3, AS-4, AS-6; EC-3, EC-5; NFR-3, NFR-4. **Evidence:** nested/empty payload tests, negative cases for non-JSON values and cycles, and sensitive-value leakage assertions.
- [x] **T05 — Deserialize and preserve identity.** Parse JSON, validate its complete V1 envelope, and serialize/deserialize or reuse an existing event without generating a new ID or changing supplied valid values and omitted fields. **Covers:** FR-1, FR-8–FR-10; AS-2, AS-3, AS-6; EC-2, EC-6, EC-7; NFR-1, NFR-3, NFR-5. **Evidence:** regression round trips for nested payload, both optional IDs, timestamp string, absent IDs, and event ID; malformed JSON and invalid content reject cleanly.
- [x] **T06 — Prove public package integration.** Extend the API compiled consumer fixture and its test to import the built `@quiron/event-envelope` public root through native workspace resolution. **Covers:** NFR-1, NFR-2; AS-1, AS-2. **Evidence:** API integration test exercises the real built export with aliases disabled and rejects a package deep import.
- [x] **T07 — Verify architectural regression controls.** Exercise the seven-project preflight and boundary matrix against allowed app/module-to-infrastructure imports and rejected infrastructure-to-module, module-to-module, deep, and filesystem imports. Check existing narrow harness exceptions and output ownership. **Covers:** NFR-2; AS-3. **Evidence:** `npm run check:projects` and `npm run check:boundaries` pass; disposable negative controls show each relevant guard fails when weakened.
- [ ] **T08 — Complete mutation and repository verification.** In disposable copies, mutate meaningful validation branches, comparisons, constants, and returns; add or improve tests for surviving defects. Restore and run the full Node 22 gate. **Covers:** FR-1–FR-10; NFR-1–NFR-5; AS-1–AS-6; EC-1–EC-7. **Evidence:** recorded killed mutants and negative controls, followed by actual `npm run check` results with zero empty or skipped-only suites.
- [ ] **T09 — Update implemented-architecture documentation.** Describe the seventh project, V1 JSON contract, ownership, allowed imports, actual graph edges, and explicit out-of-scope delivery behavior in `docs/architecture.md`; update the active `handoff.md` with durable results. **Covers:** NFR-1, NFR-2, NFR-5. **Evidence:** documentation matches project configuration and public exports; handoff records check results and remaining issues.

## Verification and review

- [ ] **T10** Claude Code reviews the approved contract, layer and output boundaries, test quality, mutation evidence, and regression risk; record findings in the handoff.
- [ ] **T11** Resolve review findings within the approved unit, rerun affected checks and the required gate, then request Elias's approval. Do not commit, merge, push, or start the next unit without explicit authorization.

## Completion record

**Checks:** pending | **Review:** pending | **Approval:** pending
