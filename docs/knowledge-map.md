# Quirón OS — Knowledge Map

> **Status:** authorized Brain annotations applied and locally verified · 2026-11-18. Independent Claude Code review: **PASS**, 2026-11-18 (reported by the human). This is a navigation and reconciliation register, not implementation authority. Local `specs/` files are gitignored in this checkout.

## Purpose and boundaries

- SDD is the implementation workflow: `spec.md` (requirements), `plan.md` (design), `tasks.md` (authorized units), `handoff.md` (execution state).
- `docs/constitution.md` contains permanent principles; `docs/architecture.md` documents accepted/implemented architecture subject to source verification.
- Source code and executed checks prove what exists; neither specs nor Brain can prove it alone.
- `../Brain/` holds historical Quirón knowledge and rationales. It remains read-only during Codex implementation. This separate knowledge-maintenance update was explicitly authorized by the human.
- This map points from active areas and decisions to the precise historical sources when verified. It does **not** duplicate the knowledge base or silently change approved requirements.

## Workspace navigation

Relative to `quiron-os/`:

| Resource | Path | Role |
| --- | --- | --- |
| Workspace instructions | `../CLAUDE.md` | Routing among Brain, implementation, reference folders |
| Brain instructions | `../Brain/CLAUDE.md` | Rules for Brain access |
| Brain index | `../Brain/index.md` | Selective entry into Brain |
| Quirón historical notes | `../Brain/01 - Quiron/` | Business and historical context; targeted notes linked below |
| Constitution | `docs/constitution.md` | Engineering principles |
| Architecture | `docs/architecture.md` | Architecture baseline |
| Specifications | `specs/` | SDD decisions and units |
| Execution handoff | `specs/<number>-<name>/handoff.md` | Latest per-spec state |

**Access:** From this repository, use `../Brain/` (uppercase `B`). Read `../Brain/CLAUDE.md` before following targeted links from `../Brain/index.md`. Do not scan all Brain content. Do not open `../prokalo/` without explicit permission. The workspace's `CLAUDE.md` keeps Brain and code workflows separate.

## Specification inventory and reconciliation

| Spec / area | Confirmed context | Brain reference | Reconciliation | Next verification |
| --- | --- | --- | --- | --- |
| `specs/001-architecture-foundation/` — Phase 0 | Completed skeleton, **retrospective reconstruction**; original handoff was supplied from an older checkout. Six projects, API health/404, empty module and Web entrypoints. | `../Brain/01 - Quiron/04 - Architecture/Mini CRM v0.1 Architecture.md`; `../Brain/02 - Decisions/Nx Monorepo and Domain-Modular Monolith Is the Repository Architecture.md` | **Brain updated—reviewed** | Historical Mini CRM plan did not establish that its database, contracts, or workflows were built. |
| `specs/002-architecture-hardening/` — Phase 1.0A | Completed remediation at `9952cea`, with recorded successful CI; six projects, independent layer policy and real test gates. | `../Brain/01 - Quiron/04 - Architecture/Tech Stack & Conventions.md`; `../Brain/01 - Quiron/04 - Architecture/Mini CRM v0.1 Architecture.md` | **Brain updated—reviewed** | Old `type:domain → type:shared` and proposed package layout are labeled historical. |
| `specs/003-event-envelope/` — Phase 1.1 | Envelope package implemented and merged in `97fdb02`; code and architecture agree. Handoff says approved/merged; local spec says Draft and tasks say approval pending. | `../Brain/02 - Decisions/Event Envelope V1.md`; `../Brain/01 - Quiron/04 - Architecture/Event Contracts.md` | **Brain updated—reviewed** | Human approved explicit supersession of the historical Brain decision with nine required fields plus one optional field. Local spec metadata still conflicts and was left untouched. |
| Future CRM, backbone, persistence, Messaging, Seguros/BP, AI, browser UI | Planned only; no later local spec found. Event Envelope provides shape/validation, not delivery. | `../Brain/01 - Quiron/04 - Architecture/QCRM v2 Architecture.md`; `../Brain/01 - Quiron/04 - Architecture/Agentic Layer.md` | **Historical/planned** | New approved specifications are required for implementation. |

A spec is **not approved or implemented** merely because it appears in this index.

## Domain knowledge index

| Topic | Existing architectural context to verify | Exact Brain note | Owning SDD / code location |
| --- | --- | --- | --- |
| Core / Spine | Canonical IDs and relationships are approved intent; business contracts remain unimplemented | `../Brain/01 - Quiron/04 - Architecture/Spine.md`; `../Brain/02 - Decisions/ID Ownership V1.md` | `docs/architecture.md`; `modules/core/src/index.ts` is an empty shell |
| Event Backbone | Historical event routing intent; delivery unimplemented | `../Brain/01 - Quiron/04 - Architecture/Event Contracts.md`; `../Brain/02 - Decisions/Event Envelope V1.md` | `specs/003-event-envelope/`; `packages/event-envelope/src/index.ts` implements envelope only |
| Domain ownership / Seguros / BP | Separate business lines; no workflows implemented | `../Brain/01 - Quiron/04 - Architecture/Domain Model.md`; `../Brain/01 - Quiron/04 - Architecture/QCRM v2 Architecture.md` | `docs/architecture.md`; module layer rules |
| Mini CRM / Hermes | September build-order exception and Hermes assignment are historical | `../Brain/02 - Decisions/Mini CRM v0.1 Is a Temporary Build-Order Exception.md`; `../Brain/01 - Quiron/04 - Architecture/Mini CRM v0.1 Architecture.md` | `AGENTS.md`; specs 001–003; Hermes inactive |

These mappings identify historical context, not implemented business features.

## Reconciliation record

For each material new or changed decision, add one row. Only mark `Brain updated` after an authorized edit has been verified.

| Date | Decision / topic | Approved SDD source | Exact Brain source | Difference or action | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-18 | Current phase and spec links | `docs/architecture.md`; specs 001–003; `97fdb02` | `../Brain/index.md` | Added dated SDD pointers and current status; historical Blueprint intent remains. | Human / knowledge maintenance | **Brain updated—reviewed** |
| 2026-11-18 | Envelope V1 contract | `specs/003-event-envelope/`; `packages/event-envelope/src/index.ts` | `../Brain/02 - Decisions/Event Envelope V1.md`; `../Brain/01 - Quiron/04 - Architecture/Event Contracts.md` | With explicit human approval, marked snake_case decision with nine required fields plus one optional field superseded by the merged six-required-field camelCase contract; original decision body preserved. | Human | **Brain updated—reviewed** |
| 2026-11-18 | Module boundaries and planned packages | `specs/002-architecture-hardening/`; `specs/003-event-envelope/`; `docs/architecture.md` | `../Brain/01 - Quiron/04 - Architecture/Tech Stack & Conventions.md`; `../Brain/01 - Quiron/04 - Architecture/Mini CRM v0.1 Architecture.md` | Labeled `type:domain → type:shared`, source aliases, and `packages/contracts/events/db` as historical proposals; current code has `layer:*` and only `packages/event-envelope`. | Human / knowledge maintenance | **Brain updated—reviewed** |
| 2026-11-18 | Hermes and Mini CRM status | `AGENTS.md`; specs 001–003; module sources | `../Brain/index.md`; `../Brain/01 - Quiron/04 - Architecture/Mini CRM v0.1 Architecture.md` | Preserved original Hermes assignment; clarified current inactive role and unimplemented Mini CRM business flow. | Human / knowledge maintenance | **Brain updated—reviewed** |
| 2026-11-18 | Spec 003 metadata | Merge `97fdb02`; local `specs/003-event-envelope/handoff.md` | No corresponding Brain status yet | Local `spec.md` says Draft; `tasks.md` says approval pending; handoff says approved/merged. Do not edit completed spec as part of Brain sync. | Human | **Metadata conflict—pending** |

**Allowed status values:** `Unverified` · `Aligned` · `Conflict—approval needed` · `SDD verified—Brain update pending` · `Brain updated—verified; review pending` · `Brain updated—reviewed` · `Historical only / superseded`.

## Update protocol

1. **On starting a spec:** read its latest handoff and current SDD files, then search this map. Consult only relevant Brain sources if additional business or historical context is needed.
2. **When encountering a conflict:** record both exact sources and the disputed rule. Stop and ask for **Before / After / Why** approval; do not infer a winner from recency alone.
3. **On an approved implementation decision:** update the appropriate active SDD artifact (without editing frozen completed specs) and the relevant map entry. Include the result in the handoff. Brain status stays pending.
4. **During separate Brain maintenance:** follow `../Brain/CLAUDE.md`, inspect targeted notes, reconcile the approved decisions with their historical context, edit only with authorization, and capture exact paths and dates in this map.
5. **Before declaring synchronized:** verify the referenced Brain notes, SDD decisions, and map entries agree; record any intentionally superseded history. A map change alone is never synchronization.

## Audit boundary

`../Brain/CLAUDE.md`, `../Brain/index.md`, targeted Quirón notes and linked decisions, all three local specifications, architecture, and relevant code were inspected. The human authorized the Brain annotations on 2026-11-18; local link and preservation checks passed. The human reported an independent Claude Code **PASS** on 2026-11-18 after targeted recheck. `../Brain/` is separate and currently unversioned, so its edits cannot be staged in a `quiron-os` commit; its synchronization is recorded in `../Brain/log.md`. The local `specs/` directory is gitignored, so its files are available for this audit but not tracked in this checkout.
