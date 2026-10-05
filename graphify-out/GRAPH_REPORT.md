# Graph Report - quiron  (2026-10-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 340 nodes · 325 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52dacec8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- ambassadors/tsconfig.lib.json
- api/project.json
- web/project.json
- ./tsconfig.base.json
- compilerOptions
- ambassadors/project.json
- core/project.json
- marketing-leads/project.json
- tasks-agenda/project.json
- nx.json
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- devDependencies
- ambassadors/package.json
- core/package.json
- marketing-leads/package.json
- tasks-agenda/package.json
- check-module-boundaries.mjs
- api/src/main.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 12 edges
2. `compilerOptions` - 8 edges
3. `compilerOptions` - 8 edges
4. `compilerOptions` - 8 edges
5. `compilerOptions` - 8 edges
6. `./tsconfig.base.json` - 7 edges
7. `targets` - 5 edges
8. `build` - 5 edges
9. `build` - 5 edges
10. `paths` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (27 total, 5 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.06
Nodes (30): nodeGlobals, author, bugs, url, description, directories, doc, homepage (+22 more)

### Community 1 - "ambassadors/tsconfig.lib.json"
Cohesion: 0.07
Nodes (25): compilerOptions, declaration, outDir, types, extends, include, compilerOptions, declaration (+17 more)

### Community 2 - "api/project.json"
Cohesion: 0.09
Nodes (24): cache, executor, options, outputs, cache, executor, options, name (+16 more)

### Community 3 - "web/project.json"
Cohesion: 0.10
Nodes (20): cache, executor, options, outputs, cache, executor, options, name (+12 more)

### Community 4 - "./tsconfig.base.json"
Cohesion: 0.11
Nodes (16): compilerOptions, outDir, rootDir, types, extends, include, compilerOptions, outDir (+8 more)

### Community 5 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, paths (+8 more)

### Community 6 - "ambassadors/project.json"
Cohesion: 0.13
Nodes (14): executor, options, outputs, name, assets, main, outputPath, tsConfig (+6 more)

### Community 7 - "core/project.json"
Cohesion: 0.13
Nodes (14): executor, options, outputs, name, assets, main, outputPath, tsConfig (+6 more)

### Community 8 - "marketing-leads/project.json"
Cohesion: 0.13
Nodes (14): executor, options, outputs, name, assets, main, outputPath, tsConfig (+6 more)

### Community 9 - "tasks-agenda/project.json"
Cohesion: 0.13
Nodes (14): executor, options, outputs, name, assets, main, outputPath, tsConfig (+6 more)

### Community 10 - "nx.json"
Cohesion: 0.14
Nodes (13): analytics, cache, cache, dependsOn, inputs, plugins, $schema, targetDefaults (+5 more)

### Community 11 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, forceConsistentCasingInFileNames, importHelpers, noFallthroughCasesInSwitch, noImplicitOverride, noImplicitReturns, noPropertyAccessFromIndexSignature, strict (+4 more)

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, forceConsistentCasingInFileNames, importHelpers, noFallthroughCasesInSwitch, noImplicitOverride, noImplicitReturns, noPropertyAccessFromIndexSignature, strict (+4 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, forceConsistentCasingInFileNames, importHelpers, noFallthroughCasesInSwitch, noImplicitOverride, noImplicitReturns, noPropertyAccessFromIndexSignature, strict (+4 more)

### Community 14 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, forceConsistentCasingInFileNames, importHelpers, noFallthroughCasesInSwitch, noImplicitOverride, noImplicitReturns, noPropertyAccessFromIndexSignature, strict (+4 more)

### Community 15 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, nx, @nx/eslint, @nx/eslint-plugin, @nx/js, tslib, @types/node (+3 more)

### Community 16 - "ambassadors/package.json"
Cohesion: 0.20
Nodes (9): dependencies, tslib, tslib, main, name, private, type, types (+1 more)

### Community 17 - "core/package.json"
Cohesion: 0.20
Nodes (9): dependencies, tslib, tslib, main, name, private, type, types (+1 more)

### Community 18 - "marketing-leads/package.json"
Cohesion: 0.20
Nodes (9): dependencies, tslib, tslib, main, name, private, type, types (+1 more)

### Community 19 - "tasks-agenda/package.json"
Cohesion: 0.20
Nodes (9): dependencies, tslib, tslib, main, name, private, type, types (+1 more)

### Community 20 - "check-module-boundaries.mjs"
Cohesion: 0.29
Nodes (6): ref_node_child_process, ref_node_fs, ref_node_path, ref_node_url, fixturePath, workspaceRoot

### Community 21 - "api/src/main.ts"
Cohesion: 0.50
Nodes (3): port, server, ref_node_http

## Knowledge Gaps
- **239 isolated node(s):** `nodeGlobals`, `author`, `url`, `description`, `doc` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 254 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `./tsconfig.base.json` connect `./tsconfig.base.json` to `compilerOptions`, `compilerOptions`, `compilerOptions`, `compilerOptions`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `nodeGlobals`, `author`, `url` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05873015873015873 - nodes in this community are weakly interconnected._
- **Should `ambassadors/tsconfig.lib.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `api/project.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `web/project.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10476190476190476 - nodes in this community are weakly interconnected._
- **Should `./tsconfig.base.json` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._