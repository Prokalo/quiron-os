# Quirón OS

The repository is an Nx domain-modular monolith. Phase 1.0A repairs the six-project skeleton, import boundaries, native package linking, and verification. Domain behavior is not implemented.

Architecture, public package entrypoints, output ownership, and checks are documented in [docs/architecture.md](docs/architecture.md). The missing original Phase 0 handoff is addressed by a [retrospective reconciliation](docs/handoffs/phase-00-baseline-reconciliation.md), not a reconstructed historical handoff.

Use Node 22. Install the locked dependencies and local workspace links with `npm ci`, then run the complete workspace validation:

    npm run check

For an uncached local run, set `NX_DAEMON=false NX_NO_CLOUD=true NX_SKIP_NX_CACHE=true NX_TUI=false`. CI already does this. `npm test` requires real tests in every project; `npm run check:boundaries` runs the public/deep-import matrix. Build the libraries before consuming their declaration files in an editor. There is no bundler or runtime alias loader.
