# Spec 001 — Architecture foundation (Phase 0)

Status: historical reconstruction of the original Phase 0 skeleton. It records implemented scope, not retrospective approval of a broader Mini CRM plan. Spec 002 supersedes identified architecture decisions.

## Scope and requirements

- Establish six Nx projects: `api`, `web`, `core`, `ambassadors`, `tasks-agenda`, and `seguros-marketing-leads`, located under `apps/` and `modules/`.
- Give each project build, lint, and typecheck targets; preserve the existing API health endpoint and add only an empty Web shell and empty library entrypoints.
- Add project tags, stable TypeScript imports through library public `src/index.ts` entrypoints, Nx module-boundary enforcement, a negative boundary probe, and Node 22 CI.
- Remove invalid or stale workspace configuration and empty placeholders without adding business behavior.

## Constraints and recorded verification

Phase 0 excludes event contracts or delivery, persistence, CRM use cases, AI services, browser UI behavior, and later domains. Recorded verification covered discovery of all six projects; successful lint, typecheck, and build for each; rejection of a deliberate domain-to-domain import; and a passing `npm run check` with CI configured to run it. This verification did not include a test framework or prove runtime resolution of the aliases. The separately supplied Phase 0 handoff reports the initial validation; [tasks](tasks.md) distinguishes that report from later retrospective inspection.
