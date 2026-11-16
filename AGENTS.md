# Repository engineering instructions

## Scope and authority
- Inspect the actual checkout and `docs/architecture.md` before changing code. Handoffs describe evidence; they do not prove implementation exists.
- Deliver only the approved logical unit. Stop for human review afterward. Do not commit, merge, or push without explicit authorization.
- Architectural/business changes require approval. Do not infer missing historical decisions or reconstruct a missing original handoff.
- Broader architecture is indexed externally by `/opt/data/brain/index.md` when that read-only environment is available. Accepted decisions outrank implementation proposals; record conflicts instead of silently resolving them.

## Boundaries
- Core, Ambassadors, Marketing Leads, and Tasks/Agenda are `layer:module` implementations, including modules classified `type:shared`.
- Modules do not import other modules. Future shared contracts belong in independently owned `layer:infrastructure` packages; they must not re-export module internals.
- Applications may compose module public package roots. Cross-module communication belongs behind the future Event Backbone and injected contracts, not direct module calls.
- Cross-project deep, filesystem, absolute, and generated-output imports are forbidden. Use relative imports only within a project.
- Production source uses static `import` / `import type`. Runtime loaders and inline/import-equals alternatives are intentionally prohibited by the current policy.
- Preserve ID and data ownership. Do not start Event Envelope, persistence, Core business contracts, lead workflows, messaging, or UI as part of architecture remediation.

## Verification
- Use Node 22 and npm's lockfile. Run `npm ci`, then `npm run check`; CI runs uncached with Nx Cloud/daemon off.
- Test production behavior or the actual architecture enforcement. Do not count an empty export, empty suite, skipped-only file, or zero Nx tasks as functionality coverage.
- Maintain the six approved projects and disjoint output ownership until a later approved phase changes the inventory.
- Exercise meaningful negative controls in disposable copies, never by mutating the user's source tree. Restore controls and rerun the gate.
- No source aliases or runtime alias loader: npm workspaces, package exports, plain TypeScript, and Nx build ordering establish linking.

## Documentation
- Track current engineering guidance under `docs/architecture.md`, decisions under `docs/decisions/`, and durable phase records under `docs/handoffs/`.
- Mark retrospective assessments as retrospective and preserve provenance for any later supplied original handoff.
- Environment/session handoffs may also go to `/opt/data/handoffs/`; that is distinct from versioned phase records. Do not use root `handoffs/` for tracked records.
- Keep `.hermes/`, local instruction overrides, generated outputs, dependencies, and secrets ignored. Never modify the read-only Brain.
