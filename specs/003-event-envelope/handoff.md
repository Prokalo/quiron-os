## Decisions

The approved seventh project, `@quiron/event-envelope`, owns the V1 contract in `layer:infrastructure`. New IDs use `globalThis.crypto.randomUUID()`; parsing and serialization preserve existing IDs. V1 rejects unknown top-level fields and unsupported versions. Event delivery remains out of scope.

## Files / symbols changed

`packages/event-envelope/`, the seven-project checks, API consumer fixture, architecture documentation, plan, and tasks changed. Local commits run from `e09d49a` through `1c94490`.

## Test status

`npm run check` passed on Node 22: seven lint/typecheck/build/test targets, 2,004 passing tests, and 1,947 boundary probes. Ten meaningful mutations were killed in disposable copies. Claude Code independently reported no blockers. Its null-timestamp observation was fixed and retested in `1c94490`; negative zero rejection follows the approved JSON integrity plan.

## Unresolved / blockers

No implementation blocker remains. Final human approval, remote CI, push, and merge are pending.

## Next actions

Elias reviews the branch and authorizes the first push or merge explicitly.
