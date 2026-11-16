# Phase 1.0A: architecture remediation

Status: human approved Phase 1.0A finalization after the review corrections, including the explicit-file commit, non-forced publication to unchanged `origin/main`, and CI verification. This does not authorize Phase 1.1. Baseline: `dbc3d1259f5a0b9d9e1030c593fe71775f6f35a3`.

## Before

Core and Tasks/Agenda carried shared type tags that permitted direct operational-module imports. The deliberate boundary check covered one domain pair. Typechecks emitted declarations to a shared output directory. Source aliases did not create runtime package links. No project had a test target, and Nx test commands could return success without executing tests. Architecture and handoff directories were ignored; the requested original Phase 0 handoff was absent.

## After

Add independent `layer:module`, `layer:infrastructure`, and `layer:app` constraints while retaining existing classification tags. Preserve application composition through module public roots only. Future shared contracts are separately owned infrastructure; no contracts implementation is introduced here.

Use native Nx, ESLint rules, Node package exports, and `node:test`. Permit small helpers only for observed native gaps: missing-target preflight, checked test discovery, per-file native-summary checks for empty/skipped/TODO-only files, Nx's absent-graph fail-open behavior, opaque runtime-loader access, and same-project artifact/test-tooling paths. Static production imports are required rather than adding a custom import resolver. Test loader privileges retain domain/public-entrypoint boundaries and narrowly scoped existing harness imports. Legacy type tags remain descriptive; independent layers govern dependencies, including infrastructure packages without legacy type tags.

Use npm workspaces and plain TypeScript with project-owned outputs. The mandatory Core/API proof ran on Node v22.23.5 with TypeScript 5.9.3 before migrating the other libraries. The fixture disabled aliases, loaded the actual built Core package, and observed deep-import rejection. No existing dependency versions changed during migration.

Track architecture instructions, this decision, and phase records. Mark the Phase 0 reconciliation as retrospective. Do not fabricate the original handoff.

## Why

These changes close demonstrated enforcement and verification gaps without implementing the event backbone, persistence, business contracts, CRM behavior, messaging, or UI. The production project inventory and all six production source entrypoints are preserved.

## Consequences

Consumers require built declarations and native workspace links. Future projects must deliberately update the inventory, ownership, and tests. The small Nx wrapper is version-sensitive and protected by an integration regression. Dynamic module loading needs a later reviewed policy. Browser/deployment packaging and all deferred domain behavior remain separate work.

See [architecture](../architecture.md) and [verification handoff](../handoffs/phase-1-0a-handoff.md).
