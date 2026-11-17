# Spec 001 — Technical plan and original decisions

The Phase 0 implementation used an Nx integrated monorepo, TypeScript 5.9.3 with NodeNext, and a local Nx runner without `nxCloudId`. `apps/api` remained the composition root; `apps/web` was a framework-neutral TypeScript shell. Four libraries lived at `modules/core`, `modules/ambassadors`, `modules/shared/tasks-agenda`, and `modules/seguros/marketing-leads`. Their `src/index.ts` files exported no business behavior. Root `tsconfig.json` supported Nx sync; generated per-library CommonJS overrides and the invalid API `ignoreDeprecations: "6.0"` setting were removed.

| Project | Original type tag | Original source tag |
| --- | --- | --- |
| API | `type:app` | `source:backend` |
| Web | `type:app` | `source:frontend` |
| Core | `type:shared` | `source:core` |
| Ambassadors | `type:domain` | `source:ambassadors` |
| Tasks/Agenda | `type:shared` | `source:tasks-agenda` |
| Marketing Leads | `type:domain` | `source:seguros` |

The original ESLint/Nx matrix allowed apps to import domain or shared libraries, domain libraries to import only shared libraries, and shared libraries to import only shared libraries. It forbade direct Ambassadors-to-Marketing-Leads imports. Core was deliberately `type:shared` so domains could use future Core contracts; Tasks/Agenda was `type:shared` because of its location. This design also permitted direct imports of the two operational shared implementations, a limitation later corrected by Spec 002.

`tsconfig.base.json` mapped `@quiron/core`, `@quiron/ambassadors`, `@quiron/tasks-agenda`, and `@quiron/seguros-marketing-leads` to their respective `src/index.ts` files. Nx understood these imports for graph and boundary analysis. Phase 0 did not establish native runtime package resolution. `tools/check-module-boundaries.mjs` created one temporary Ambassadors-to-Marketing-Leads import, required the Nx ESLint rule to reject it, and removed only a fixture it had successfully created. CI used Node 22, `npm ci`, and `npm run check`; the gate ran lint/typecheck/build and this single negative probe.

**Superseded by Spec 002:** permission-bearing `type:*` rules; Core/Tasks-Agenda shared implementation imports; TypeScript source aliases; package metadata pointing into source; overlapping library typecheck output; absence of real test targets; and the single-pair boundary probe. The `source:*` tags remain descriptive. The six project names, API health behavior, and empty domain/Web production shells remain.
