# Spec 002 — Architecture hardening (Phase 1.0A)

Status: completed and published by commit `9952cea` on `main`. This specification records the approved remediation against baseline `dbc3d12`; it does not authorize or implement Event Envelope V1.

## Scope and requirements

- Preserve the six production projects and their production source behavior while replacing the permissive shared/domain policy with independent `layer:module`, `layer:infrastructure`, and `layer:app` boundaries.
- Expose the four existing modules through public package roots, reject deep and filesystem imports, and prove native npm/Node linking with isolated TypeScript outputs.
- Give every project a real, finite, uncached test target; fail when projects, targets, test files, Nx graph data, or meaningful test execution are missing.
- Apply the boundary policy to TypeScript and executable JavaScript in project roots, including tests; restrict production runtime loaders without allowing test code to bypass dependency direction or public entrypoints.
- Add Node 22 CI and documented, repeatable verification with negative controls.

## Constraints and acceptance criteria

No seventh production project, new external dependency version, application feature, event contract, persistence, database, messaging, AI orchestration, or CRM workflow. Acceptance required a built Core package consumed by a real API TypeScript fixture with aliases disabled; successful native Node loading and deep-export rejection; all six project gates and tooling checks; complete allowed/rejected boundary cases; source and cold-install checks; and successful CI for the published commit. [Tasks](tasks.md) records what was reported locally and independently verified remotely.
