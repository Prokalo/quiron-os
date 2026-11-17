# Quirón OS

The repository is an Nx domain-modular monolith. Phase 1.0A hardened the six-project skeleton, import boundaries, native package linking, and verification. Domain behavior is not implemented.

The current implementation is documented in [architecture](docs/architecture.md), with six approved principles in the [constitution](docs/constitution.md). [Spec 001 — Architecture Foundation](specs/001-architecture-foundation/spec.md) and [Spec 002 — Architecture Hardening](specs/002-architecture-hardening/spec.md) preserve historical scope, decisions, evidence, and limits.

Use Node 22. Install the locked dependencies and local workspace links with `npm ci`, then run the complete workspace validation:

    npm run check

For an uncached local run, set `NX_DAEMON=false NX_NO_CLOUD=true NX_SKIP_NX_CACHE=true NX_TUI=false`. CI already does this. `npm test` requires real tests in every project; `npm run check:boundaries` runs the public/deep-import matrix. Build the libraries before consuming their declaration files in an editor. There is no bundler or runtime alias loader.
