# Repository architecture — Phase 1.0A

This describes implementation guardrails, not completed CRM functionality. The production workspace contains exactly `core`, `ambassadors`, `tasks-agenda`, `seguros-marketing-leads`, `api`, and `web`.

## Layer ownership and public surfaces

| Projects | Layer | Permitted project dependencies |
| --- | --- | --- |
| Core, Ambassadors, Marketing Leads, Tasks/Agenda | `layer:module` | Future `layer:infrastructure` packages only |
| API, Web | `layer:app` | Module and infrastructure public roots |
| Future shared infrastructure | `layer:infrastructure` | Infrastructure public roots only |

Existing `type:*` / `source:*` tags remain classifications, not an additional permission gate. Dependency direction is governed by the independent layer constraints: a future infrastructure package does not need a legacy `type:shared` tag to be consumable. Core is a module implementation, not a shared contracts package. Tasks/Agenda is an operational shared capability, not generic infrastructure. Every current project has exactly one approved layer tag; the preflight validates both the actual Nx graph and required targets.

The four `@quiron/*` library package roots are application-facing facades. A public module facade is **not** an inter-module contract. Modules cannot import even the public root of another module. Future shared contracts must be separately owned and cannot import/re-export module implementations. No actual contracts package is created in this phase.

Only each package's `.` export is public. Source/output subpaths, package metadata subpaths, cross-project relative paths, absolute/file-URL paths, workspace-root paths, and unknown workspace names are rejected. Same-project relative source/helper imports remain legal, except filesystem imports into generated `dist/` or `node_modules/` and production imports of the root test tooling directory. Applications retain composition permissions through public roots. Executable JS/MJS/CJS/JSX throughout project roots under `apps/`, `modules/`, and future `packages/` receives the same boundary policy as TypeScript, not just files inside `src/`. The policy has an explicit workspace `basePath` so a library's local ESLint configuration and working directory cannot narrow that coverage.

JS-family files under each application's or declared workspace package's root `test/` directory receive native-loader permissions only, not an exemption from dependency direction or public-entrypoint checks. Nx layer rules and static import/re-export restrictions still apply; literal CommonJS and dynamic workspace imports also reject unknown roots and deep paths. Local test helpers and imports of the owning project's source remain legal. A `src/test/` directory or an arbitrary `*.test.mjs` elsewhere does not receive loader privileges. TypeScript consumer fixtures retain the production loader restrictions. ESLint configurations and workspace `tools/` remain trusted configuration/verification tooling; generated `dist/` files remain ignored as lint inputs.

The six existing `test/boundaries.test.mjs` entrypoints may import only their exact relative path to `tools/check-module-boundaries.mjs`; this does not allow other tools or grant that path to other tests. Only `apps/api/test/library-consumption.test.mjs` may load its exact compiled consumer fixture `../../../dist/test-fixtures/api/consume-libraries.js`. Other generated-output imports remain forbidden. These narrow pre-existing harness dependencies are explicit exceptions, not permission for application composition through filesystem paths.

Production code uses static imports and `import type`. Dynamic imports, CommonJS loaders, loader factories, import-equals, and inline import types are conservatively prohibited. This avoids unsupported syntax bypasses without implementing a custom module resolver. Relaxing this policy later requires corresponding positive and negative tests. Package exports and lint are architecture controls, not a runtime security sandbox.

CommonJS restrictions are scope-aware: global `require`/`module` loader references (including aliases and global-object access) and `process.mainModule` are prohibited. Ordinary data/type properties named `require` and locally declared bindings are allowed; there is no blanket ban on that identifier.

The direct runtime/native loader restriction also covers `process.getBuiltinModule`, `process.binding`, `process._linkedBinding`, and `process.dlopen`. Dot, literal-computed, no-expression template, optional and destructured access is rejected. Named loader imports/re-exports from `node:process`/`process` and full default/namespace process imports are rejected; named safe imports such as `env` and `pid` remain legal. `node:vm`/`vm`, global `eval` and `Function` code generation are not alternatives to static imports.

A small inline `qcrm/static-runtime-access` rule closes the demonstrated gap left by native named-property rules: copying ambient process/global objects or using opaque computed keys could hide a loader access. It checks references to the actual ambient bindings, not every identifier named `process`, and requires static property access or static non-rest destructuring. Static `process.env` reads (including dynamic environment keys), normal process metadata, `typeof process`, unrelated local data and type members remain permitted. Global-object process aliases are rejected in favor of the canonical process binding. This rule does not implement module resolution or general dataflow analysis.

## Native enforcement

Nx's `@nx/enforce-module-boundaries` implements dependency direction, buildability, cycles, and cross-project relative-path checks. Native ESLint `no-restricted-imports` and `no-restricted-syntax` enforce public entrypoints and unsupported loader restrictions. The package-root allowlist derives from explicit npm workspace manifests, not a second hardcoded alias table.

Direct probes confirmed that Nx already rejects relative escapes into workspace `dist/`, `node_modules/`, `tools/`, non-project files, and paths outside the workspace. That enforcement is unchanged. A small inline `qcrm/relative-import-policy` rule closes the confirmed same-project gaps: normalized relative artifact paths and production-to-test-tooling imports. It performs lexical containment checks for static imports/re-exports and literal require/import expressions, not filesystem/module resolution. The compiled API fixture exception is restricted to the exact importer and specifier above.

Nx 22.7.12 silently returns an empty rule listener when its cached graph is missing. A small inline wrapper preserves Nx's native rule and changes that skip into a lint error. The test suite reproduces both the native fail-open behavior and the wrapped failure. Use `npm run check:projects` before invoking standalone ESLint; normal Nx lint builds its graph first. The additional local rules are the scoped opaque-runtime-access and relative-import checks above; no separately installed plugin or custom dependency resolver exists.

## Linking and build outputs

Use Node 22, npm workspaces, TypeScript 5.9.3 with NodeNext/CommonJS, and ordinary Node package resolution. The four explicit workspace roots are the existing operational libraries. There are no source-path aliases, runtime loaders, bundlers, or TypeScript build-reference orchestrators.

Before wider migration, Core alone was linked and built, and a real API TypeScript fixture compiled with `paths: {}` and executed successfully on Node v22.23.5. Only after that proof passed were the other libraries migrated. `apps/api/test/fixtures/consume-libraries.ts` now imports all four actual package roots. Its compiled output is tested using native Node resolution; deep exports must fail at runtime as well as lint time.

The four current API-to-library graph edges come solely from that test fixture, not `apps/api/src/main.ts` or production composition. An isolated regression removes the fixture and observes those edges disappear, then restores it. `^build` scheduling follows graph edges; these fixture edges must not be presented as implemented production integration.

| Owner | Build output |
| --- | --- |
| Core | `modules/core/dist/` |
| Ambassadors | `modules/ambassadors/dist/` |
| Tasks/Agenda | `modules/shared/tasks-agenda/dist/` |
| Marketing Leads | `modules/seguros/marketing-leads/dist/` |
| API | `dist/apps/api/` |
| Web placeholder | `dist/apps/web/` |
| API consumer fixture | `dist/test-fixtures/api/` |

Library `rootDir` is `src`, `outDir` is local `dist`, and builds emit JavaScript/declarations. `main`, `types`, and `exports` point to those local outputs. Library builds use plain `tsc -p`, replacing the inferred declaration-emitting typecheck targets. Typecheck commands use `--noEmit`; Nx can first build dependency declarations via `^build`. Build outputs are declared explicitly, and cache inputs include the root TypeScript configuration and lockfile.

Run `npm ci` to create native workspace links. Build dependencies before editor consumption of declarations. Deployment packaging and a real browser build are not established by this skeleton. Web remains an empty TypeScript application entrypoint.

## Verification commands

- `npm run check:projects`: obtain a fresh native Nx graph; require the six projects, valid layers, lint/typecheck/build/test targets, real test files, and disjoint build-output declarations. Test invocations must match the approved executable command shapes exactly, use `nx:run-commands` without shortcut options, remain finite/uncached, and depend on `build` and `^build`; build targets must also depend on `^build`. Echoes, comments, shell wrappers and suppressed failures are not accepted as runner invocations.
- `npm run lint`: lint all six projects plus verification tools/configuration. `tools/**/*.mjs` and `eslint.config.mjs` have semantic rules for undefined/unused names, unreachable code, duplicate keys, invalid typeof checks and async Promise executors; regressions verify validly parsed violations fail, rather than counting parse checking as tooling lint.
- `npm test`: run preflight, tooling self-tests, and every project's test target.
- `npm run check:boundaries`: run preflight and the complete allowed/rejected boundary matrix.
- `npm run check`: run the complete lint/typecheck/build/test/boundary gate.

CI uses Node 22 with `NX_DAEMON=false`, `NX_NO_CLOUD=true`, `NX_SKIP_NX_CACHE=true`, and `NX_TUI=false`. Use those settings for an uncached local verification. Test targets are always uncached.

Tests run with native `node:test` and its TAP reporter. Node 22 accepts unmatched test globs and treats empty files as passing file-level tests. A small checked-discovery launcher passes explicit files to Node's native `run()` API and checks its per-file summaries: every file must report actual tests and non-skipped, non-TODO passes. Missing summaries, empty suites, TODO-only files, cancellations, and failures are errors; a passing sibling cannot conceal an empty/pending file. No preload, custom reporter, or hook-based test counter is used. The project preflight prevents Nx's missing-target/zero-task success from becoming a green gate. Temporary fixtures use `node:os.tmpdir()` rather than assuming `TMPDIR` is defined.

The boundary matrix lints virtual source against the real configuration without creating production-checkout fixtures. Infrastructure-positive cases use temporary, independently tagged test-only Nx projects outside the production checkout. Integration tests additionally create real project-root JS/MJS/CJS files in the disposable copy, lint them from every project's working directory, and prove both loader rejection and safe-process acceptance. They copy current uncommitted implementation files—not old HEAD—and exercise weakened-policy, disabled loader/path/test-boundary guards, narrowed JS coverage, missing-graph, missing-target, missing-test, and illegal-source negative controls. Workspace links must resolve to the actual disposable project copies, not the original projects; a deliberately wrong link must fail that assertion before it can be used for builds/writes. Cleanup verifies removal of the actual allocated fixture directory, not absence of an unrelated path. Temporary processes and fixtures are cleaned up.

These are static architecture checks for reviewed application code, not a security sandbox for hostile JavaScript. Arbitrary reflection, constructed code, process spawning and runtime tampering require separate capability/sandbox controls; the rules make no claim to contain all JavaScript execution or future Node APIs. New runtime-loading requirements need explicit review rather than bypassing the listed restrictions.

See [the implementation handoff](handoffs/phase-1-0a-handoff.md) for actual counts, evidence, deviations, and remaining risks, and [Phase 0 reconciliation](handoffs/phase-00-baseline-reconciliation.md) for historical limitations.
