# Phase 0 baseline reconciliation — retrospective, not recovered history

## Provenance and limitations

This is a retrospective assessment of repository baseline `dbc3d1259f5a0b9d9e1030c593fe71775f6f35a3`, not the original Phase 0 handoff. `docs/handoffs/phase-00-handoff.md` was absent from the checkout and the reachable path history inspected. No original author, date, acceptance, or completion claim is inferred. If an external original is supplied, preserve it verbatim with provenance rather than replacing this assessment.

Evidence comes from the actual baseline files, the preceding read-only inspection in this conversation, and indexed approved architecture context. The Brain specification's older repository snapshot and the external graph report were not treated as the current implementation.

## Observed baseline

The clean `main` checkout contained six Nx 22.7.12 projects: Core, Ambassadors, Tasks/Agenda, Marketing Leads, API, and Web. Four libraries exported nothing. API implemented `/health` and JSON 404 responses; Web was a TypeScript placeholder, not a browser application. Four source aliases existed, but native Node could not resolve their package names.

The prior inspection ran the baseline gate uncached in an isolated Git archive with existing dependencies on Node 26.12.1: all 18 lint/typecheck/build targets and the single deliberate boundary probe passed. Nx test reported “No tasks were run”; the optional test-script invocation executed nothing. Those were not test passes, and they were not Node 22 verification.

Core and Tasks/Agenda's shared tags allowed direct implementation imports. The boundary check covered only Ambassadors to Marketing Leads. Library typechecks emitted declarations/build info to overlapping `dist/out-tsc` outputs. The README linked a nonexistent architecture document, and docs/handoff/instruction patterns were ignored.

## Missing versus deferred

The repository had no test harness, shared contract packages, database integration, migrations, persistence, event envelope, transactional event store, outbox, consumer idempotency, Party resolution, lead workflow, auth, or usable web shell. External database provisioning was unknown, not disproved.

The approved Mini CRM build specification described a broader Phase 0 than the README's skeleton-only statement. Therefore this assessment does not certify Phase 0 complete. Phase 1.0A repairs architecture/build/test/documentation readiness only; it does not fulfill the database or domain prerequisites.

## Next boundary

Review [Phase 1.0A's actual implementation evidence](phase-1-0a-handoff.md). Further event, database, contract, and business units require separate approval. The Mini CRM remains scoped through `lead.appointment_confirmed`; no downstream sales functionality is inferred or created.
