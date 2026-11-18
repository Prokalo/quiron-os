# Quirón OS

Quirón OS is an Nx domain-modular monolith using Node 22, TypeScript, npm workspaces, ESLint, and native `node:test`.

The current implementation contains seven production projects:

- Applications: `api` and `web`
- Modules: `core`, `ambassadors`, `tasks-agenda`, and `seguros-marketing-leads`
- Infrastructure package: `event-envelope`

The API provides `/health` and JSON 404 responses. The Web shell and module production entrypoints remain shells. Event Envelope V1 defines and validates the shared JSON event contract. It does not implement publication, routing, delivery, persistence, or domain payload rules.

The implemented architecture is documented in [architecture](docs/architecture.md), with the approved engineering principles in the [constitution](docs/constitution.md). Historical specifications are [Spec 001 — Architecture Foundation](specs/001-architecture-foundation/spec.md), [Spec 002 — Architecture Hardening](specs/002-architecture-hardening/spec.md), and [Spec 003 — Event Envelope](specs/003-event-envelope/spec.md).

CRM business behavior, an event backbone, persistence, AI orchestration, and browser UI behavior are not implemented.

Install the locked dependencies and local workspace links with `npm ci`, then run the complete workspace validation:

    npm run check

For an uncached local run, set `NX_DAEMON=false NX_NO_CLOUD=true NX_SKIP_NX_CACHE=true NX_TUI=false`. CI uses these settings. `npm test` runs the workspace tests, and `npm run check:boundaries` runs the import and public-entrypoint boundary matrix.
