# Spec 002 — Completion and evidence

Status: completed at [`9952cea3885a2d10b9e7a43248813001e17b24a0`](https://github.com/Prokalo/quiron-os/commit/9952cea3885a2d10b9e7a43248813001e17b24a0) on `main`, with [GitHub CI run `43948841941`](https://github.com/Prokalo/quiron-os/actions/runs/43948841941) completed successfully for that exact SHA. The run's `npm ci` and `npm run check` steps succeeded. These publication facts were independently checked against GitHub; numerical local counts below come from the published implementation handoff and were not independently recounted from CI logs.

## Checklist

- [x] Six production projects retained; all six production entrypoint sources unchanged from baseline. No seventh production project or business implementation.
- [x] Independent layer boundaries, public dot-only exports, deep-import checks, executable JavaScript coverage, production loader restrictions, and narrow test/harness exceptions.
- [x] Native npm workspace links, project-owned library outputs, no source aliases, and an API fixture that compiles with aliases disabled and loads built packages through Node.
- [x] Real test targets, checked discovery, project/graph preflight, tooling lint, full boundary matrix, disposable negative controls, and Node 22 CI.
- [x] Published commit and exact-commit successful CI.
- [ ] Event Envelope V1, contracts package, persistence, browser UI, deployment packaging, and CRM workflows: deferred beyond this specification.

## Verification chronology

The [published implementation handoff at `9952cea`](https://github.com/Prokalo/quiron-os/blob/9952cea3885a2d10b9e7a43248813001e17b24a0/docs/handoffs/phase-1-0a-handoff.md) reports a Core-only workspace/API consumption proof on Node 22.23.5 before broader migration: the fixture used `paths: {}`, loaded built Core through native resolution, and rejected a deep subpath. Earlier implementation and review checkpoints reported 333 tests/306 boundary probes and then 426 tests/384 probes; later 954-test evidence was superseded. The ignored `quiron/handoffs/session#_phase-1-0a-architecture-remediation.md` and `quiron/handoffs/session#_phase-1-0a-post-review-corrections.md` preserve those checkpoint summaries in the older checkout.

The final published handoff reports two uncached Node 22.23.5 `npm ci` + `npm run check` passes: source checkout with outputs present and an independent cold copy without dependencies, graph cache, or outputs. It reports all six lint/typecheck/build targets, tooling lint, mandatory tests, preflight, and boundary checks passed. **Reported local total: 1,557 passed, zero failed/cancelled/skipped/TODO.** Breakdown: Core 247, Ambassadors 247, Tasks/Agenda 247, Marketing Leads 247, Web 262, API 279, tooling 28. The **1,515 boundary probes** (287 allowed, 1,228 rejected) are included in those 1,557 tests; the standalone matrix repeats them. Seven explicit no-emit checks passed without changing measured files. The fresh graph had only API test-fixture-to-library edges; an isolated fixture-removal regression made all four disappear. A lockfile comparison reported all 402 external entries retained their versions, URLs, and integrity values; four local workspace links were added.

Negative controls in disposable copies confirmed failure for missing test targets/files, weakened layers, disabled deep-import/loader/path/test guards, missing Nx graph, narrowed JavaScript coverage, and invalid runner/build prerequisites. Review corrections added native per-file test summaries, `node:os.tmpdir()` fixtures, semantic tooling lint, scope-aware loader restrictions, API startup collision handling, root-wide JS coverage, test-file boundary protection, exact harness exceptions, and an actual workspace-link isolation assertion. The original source checkout was not used for mutation controls.

The ignored `quiron/handoffs/qcrm-phase-1-0a-final.md` records an **earlier** checkpoint at `dbc3d12` where staging, author identity, push authorization, and object-store permissions blocked publication; it explicitly had no new commit or CI result then. The subsequent GitHub commit and successful run resolve that publication chronology. That older handoff's local 1,557/1,515 figures agree with the published implementation handoff but remain reported counts.

## Known limitations

Nx 22's missing-graph wrapper and parser reference handling need regression checks on upgrades. Runtime-loader rules and the lexical relative-path guard are static architecture policy, not a hostile-code sandbox or complete dataflow/realpath analysis; trusted test/config tooling and computed test-loader targets remain outside full containment. The integration test keeps a 120-second outer timeout and 45-second subprocess caps. Test commands assume workspace-root invocation. API test-fixture output collision ownership is not fully preflighted. Library consumers need workspace links and built declarations; the Web shell has no browser build/deployment proof. API module edges are test-fixture-only. Architecture tests are not CRM functionality coverage.

The original Phase 0 handoff **reported** eight high-severity npm audit findings; they were not freshly reproduced during this documentation migration, and dependency remediation remains separate work. The current CI workflow still uses `actions/checkout@v4` and `actions/setup-node@v4` tag references rather than immutable SHAs and declares no explicit minimal permissions scope such as `contents: read`. These are outstanding hardening items, not changes made by Spec 002 or this correction.

## Source provenance

Consolidated from the published decision record, published Phase 1.0A handoff, and the three separately supplied local Phase 1.0A checkpoint handoffs. Scratch log paths in the handoffs were transient supplementary evidence, so this record preserves their reported outcomes and publication references rather than treating the scratch files as durable artifacts. Completed Spec 002 is frozen except for explicitly documented factual corrections; later changes require a new specification.
