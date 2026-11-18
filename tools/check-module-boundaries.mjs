import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { projectRoots, readGraph, validateProjects, workspaceRoot } from './check-projects.mjs';

const libraries = Object.fromEntries(
  Object.entries(projectRoots).filter(([, root]) => root.startsWith('modules/') || root.startsWith('packages/')).map(([name, root]) =>
    [name, JSON.parse(readFileSync(path.join(workspaceRoot, root, 'package.json'))).name],
  ),
);

const mayImport = (source, target) =>
  projectRoots[source].startsWith('apps/') || (target === 'event-envelope' && source !== target);

/** Describe expected policy; ESLint/Nx, not this matrix, enforces production code. */
export function boundaryCases(name) {
  assert.ok(projectRoots[name], `Unknown project: ${name}`);
  const root = projectRoots[name];
  const isApp = root.startsWith('apps/');
  const filePath = path.join(root, 'src', '__boundary_probe__.ts');
  const cases = [];
  const add = (label, code, rule = null) => cases.push({ name: label, code, rule, filePath });
  add('Node builtin', "import 'node:crypto';");
  add('own relative entry', `import './${isApp ? 'main' : 'index'}.js';`);
  add('unknown workspace root', "import '@quiron/missing';", 'no-restricted-imports');
  add('computed dynamic loader', "const target = '@quiron/core'; import(target);", 'no-restricted-syntax');
  add('literal dynamic loader', "import('@quiron/core');", 'no-restricted-syntax');
  add('CommonJS loader', "require('@quiron/core');", 'no-restricted-globals');
  add('CommonJS resolution', "require.resolve('@quiron/core');", 'no-restricted-globals');
  add('CommonJS loader alias', "const load = require; load('@quiron/core');", 'no-restricted-globals');
  add('global CommonJS loader', "globalThis.require('@quiron/core');", 'no-restricted-globals');
  add('computed global CommonJS loader', "globalThis['require']('@quiron/core');", 'no-restricted-globals');
  add('Node global CommonJS loader', "global.require('@quiron/core');", 'no-restricted-globals');
  add('CommonJS module loader', "module.require('@quiron/core');", 'no-restricted-globals');
  add('CommonJS module loader alias', "const load = module.require; load('@quiron/core');", 'no-restricted-globals');
  add('global CommonJS module loader', "globalThis.module.require('@quiron/core');", 'no-restricted-globals');
  add('legacy process loader', "process.mainModule.require('@quiron/core');", 'no-restricted-properties');
  add('builtin module loader escape', "process.getBuiltinModule('node:module').createRequire(import.meta.url)('@quiron/core');", 'no-restricted-properties');
  for (const property of ['getBuiltinModule', 'binding', '_linkedBinding', 'dlopen', 'mainModule']) {
    add(`${property} direct access`, `const loader = process.${property};`, 'no-restricted-properties');
    add(`${property} computed literal`, `const loader = process['${property}'];`, 'no-restricted-properties');
    add(`${property} computed template`, `const loader = process[\`${property}\`];`, 'no-restricted-properties');
    add(`${property} optional access`, `const loader = process?.${property};`, 'no-restricted-properties');
    add(`${property} destructured alias`, `const { ['${property}']: loader } = process;`, 'no-restricted-properties');
    for (const source of ['node:process', 'process']) {
      add(`${property} imported from ${source}`, `import { ${property} as loader } from '${source}';`, 'no-restricted-imports');
      add(`${property} re-exported from ${source}`, `export { ${property} as loader } from '${source}';`, 'no-restricted-imports');
    }
  }
  for (const source of ['node:process', 'process']) {
    add(`${source} default loader object`, `import runtime from '${source}'; runtime.getBuiltinModule('node:module');`, 'no-restricted-imports');
    add(`${source} namespace loader object`, `import * as runtime from '${source}'; runtime.getBuiltinModule('node:module');`, 'no-restricted-imports');
    add(`${source} named safe imports`, `import { env, pid as id } from '${source}'; export const info = { env, id };`);
    add(`${source} named safe exports`, `export { env, pid as id } from '${source}';`);
  }
  add('opaque process alias', "const runtime = process; runtime.getBuiltinModule('node:module');", 'qcrm/static-runtime-access');
  add('process assignment alias', "let runtime; runtime = process;", 'qcrm/static-runtime-access');
  add('process spread alias', 'const runtime = { ...process };', 'qcrm/static-runtime-access');
  add('computed process key', "const key = 'getBuiltinModule'; process[key]('node:module');", 'qcrm/static-runtime-access');
  add('concatenated process key', "process['get' + 'BuiltinModule']('node:module');", 'qcrm/static-runtime-access');
  add('interpolated process key', "process[`get${'BuiltinModule'}`]('node:module');", 'qcrm/static-runtime-access');
  add('dynamic process destructuring', "const key = 'binding'; const { [key]: loader } = process;", 'qcrm/static-runtime-access');
  add('rest process destructuring', 'const { env, ...runtime } = process;', 'qcrm/static-runtime-access');
  add('global process alias', "globalThis.process.getBuiltinModule('node:module');", 'no-restricted-properties');
  add('computed global process alias', "global['process']['getBuiltinModule']('node:module');", 'no-restricted-properties');
  add('opaque global alias', "const root = globalThis; root.process.getBuiltinModule('node:module');", 'qcrm/static-runtime-access');
  add('computed global key', "globalThis['pro' + 'cess'].getBuiltinModule('node:module');", 'qcrm/static-runtime-access');
  add('eval loader escape', "eval('process.getBuiltinModule');", 'no-eval');
  add('Function loader escape', "Function('return process')();", 'no-restricted-globals');
  add('VM code loader', "import { runInThisContext } from 'node:vm';", 'no-restricted-imports');
  add('legacy VM code loader', "import vm from 'vm';", 'no-restricted-imports');
  add('safe process reads', "export const info = { pid: process['pid'], platform: process[`platform`], mode: process.env['QCRM_MODE'] };");
  add('safe process destructuring', 'const { env, pid } = process; export const info = { env, pid };');
  add('runtime availability check', 'export const available = typeof process;');
  add('type-only runtime metadata', 'export type RuntimeMetadata = typeof process;');
  add('qualified type-only runtime metadata', 'export type RuntimeMetadata = typeof globalThis.process.env;');
  add('loader-named data properties', "const metadata = { binding: 'label', getBuiltinModule: true }; export const label = metadata.binding;");
  add('loader-named type properties', 'export interface Metadata { binding: string; getBuiltinModule: boolean }');
  add('unrelated local process binding', "const process = { env: { label: 'local' } }; const copy = process; export const label = copy.env.label;");
  add('require data property', "const options = { require: true }; export const required = options.require;");
  add('local module require data property', "const module = { require: true }; export const required = module.require;");
  add('require type member', 'export interface Options { require: boolean }');
  add('local binding named require', "const require = (value: string) => value; export const result = require('local-value');");
  add('loader factory', "import { createRequire } from 'node:module';", 'no-restricted-imports');
  add('inline import type', "type T = typeof import('@quiron/core');", 'no-restricted-syntax');
  add('import equals', "import Core = require('@quiron/core');", 'no-restricted-syntax');
  cases.push({
    name: 'JavaScript source has the same boundary policy',
    filePath: filePath.replace('.ts', '.mjs'),
    code: isApp ? "import '@quiron/core/src/index.js';" : `import '@quiron/${name === 'core' ? 'tasks-agenda' : 'core'}';`,
    rule: isApp ? 'no-restricted-imports' : '@nx/enforce-module-boundaries',
  });
  for (const extension of ['js', 'mjs']) {
    cases.push({
      name: `project-root ${extension} preserves composition direction`,
      filePath: path.join(root, `__boundary_entry__.${extension}`),
      code: `import '@quiron/${name === 'core' ? 'tasks-agenda' : 'core'}';`,
      rule: isApp ? null : '@nx/enforce-module-boundaries',
    }, {
      name: `project-root ${extension} rejects deep imports`,
      filePath: path.join(root, `__boundary_entry__.${extension}`),
      code: "import '@quiron/core/src/index.js';", rule: 'no-restricted-imports',
    }, {
      name: `outside-src ${extension} blocks builtin loaders`,
      filePath: path.join(root, 'runtime', `__boundary_entry__.${extension}`),
      code: "process.getBuiltinModule('node:module');", rule: 'no-restricted-properties',
    });
  }
  cases.push({
    name: 'outside-src CommonJS rejects runtime loading', filePath: path.join(root, 'runtime', '__boundary_entry__.cjs'),
    code: "require('@quiron/core');", rule: 'no-restricted-globals',
  }, {
    name: 'test tooling can use Node loaders', filePath: path.join(root, 'test', 'helpers', '__boundary_tool__.mjs'),
    code: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url); require('node:path');", rule: null,
  }, {
    name: 'src test-named directory is not a tooling exemption', filePath: path.join(root, 'src', 'test', '__boundary_entry__.mjs'),
    code: "process.binding('contextify');", rule: 'no-restricted-properties',
  }, {
    name: 'test filename outside tooling directory is still production', filePath: path.join(root, '__boundary_entry__.test.mjs'),
    code: "process.getBuiltinModule('node:module');", rule: 'no-restricted-properties',
  });
  const at = (label, source, code, rule = null) => cases.push({ name: label, filePath: source, code, rule });
  const testPath = path.join(root, 'test', '__closure_probe__.mjs');
  for (const extension of ['mjs', 'js', 'ts']) {
    const source = testPath.replace('.mjs', `.${extension}`);
    at(`test ${extension} local helper`, source, "import './helpers/local.mjs';");
    at(`test ${extension} normalized local helper`, source, "import './helpers/../helpers/local.mjs';");
    at(`test ${extension} own source`, source, `import '../src/${isApp ? 'main' : 'index'}.js';`);
    for (const [target, pkg] of Object.entries(libraries)) {
      if (target !== name) {
        at(`test ${extension} ${target} public root`, source, `import '${pkg}';`, mayImport(name, target) ? null : '@nx/enforce-module-boundaries');
        at(`test ${extension} ${target} public re-export`, source, `export * from '${pkg}';`, mayImport(name, target) ? null : '@nx/enforce-module-boundaries');
        const relative = path.relative(path.dirname(source), path.join(projectRoots[target], 'src/index.js'));
        at(`test ${extension} ${target} cross-project path`, source, `import '${relative}';`, '@nx/enforce-module-boundaries');
      }
      at(`test ${extension} ${target} deep import`, source, `import '${pkg}/src/index.js';`, 'no-restricted-imports');
      at(`test ${extension} ${target} deep re-export`, source, `export * from '${pkg}/dist/index.js';`, 'no-restricted-imports');
    }
  }
  const other = name === 'core' ? 'tasks-agenda' : 'core';
  const loader = "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);";
  at('test CommonJS public root direction', testPath, `${loader} require('@quiron/${other}');`, isApp ? null : '@nx/enforce-module-boundaries');
  at('test CommonJS deep import', testPath, `${loader} require('@quiron/core/src/index.js');`, 'no-restricted-modules');
  at('test CommonJS unknown workspace root', testPath, `${loader} require('@quiron/missing');`, 'no-restricted-modules');
  at('test CommonJS local helper', testPath, `${loader} require('./helpers/local.mjs');`);
  at('test dynamic Node loader', testPath, "import('node:module');");
  at('test dynamic public root direction', testPath, `import('@quiron/${other}');`, isApp ? null : '@nx/enforce-module-boundaries');
  at('test dynamic deep import', testPath, "import('@quiron/core/src/index.js');", 'no-restricted-syntax');
  at('test dynamic unknown workspace root', testPath, "import('@quiron/missing');", 'no-restricted-syntax');
  at('test CommonJS generated output', testPath, `${loader} require('../dist/index.js');`, 'qcrm/relative-import-policy');
  at('test dynamic generated output', testPath, "import('../dist/index.js');", 'qcrm/relative-import-policy');
  const commonJsTest = testPath.replace('.mjs', '.cjs');
  at('CJS test native and local helpers', commonJsTest, "require('node:path'); require('./helpers/local.cjs');");
  at('CJS test public root direction', commonJsTest, `require('@quiron/${other}');`, isApp ? null : '@nx/enforce-module-boundaries');
  at('CJS test deep import', commonJsTest, "require('@quiron/core/dist/index.js');", 'no-restricted-modules');
  for (const target of ['dist/apps/api/main.js', 'node_modules/tslib/tslib.js', 'tools/check-projects.mjs', 'README.md', '../outside-qcrm/entry.js']) {
    for (const [kind, source] of [['production', filePath], ['test', testPath]]) {
      const relative = path.relative(path.dirname(source), target);
      at(`${kind} relative escape ${target}`, source, `import '${relative}';`, '@nx/enforce-module-boundaries');
    }
  }
  for (const [kind, source] of [['production', filePath], ['test', testPath]]) {
    at(`${kind} own generated output`, source, "import '../dist/index.js';", 'qcrm/relative-import-policy');
    at(`${kind} own node_modules`, source, "import '../node_modules/tslib/tslib.js';", 'qcrm/relative-import-policy');
    at(`${kind} normalized generated output re-export`, source, "export * from './nested/../../dist/index.js';", 'qcrm/relative-import-policy');
  }
  at('production cannot load privileged test helper', filePath, "import '../test/helpers/loader.mjs';", 'qcrm/relative-import-policy');
  at('production cannot load privileged test directory', filePath, "import '../test';", 'qcrm/relative-import-policy');
  at('production cannot re-export privileged test helper', filePath, "export * from './nested/../../test/helpers/loader.mjs';", 'qcrm/relative-import-policy');
  at('ordinary src test directory remains local source', filePath, "import './test/helper.mjs';");
  at('normalized own source remains legal', filePath, `import './nested/../${isApp ? 'main' : 'index'}.js';`);
  const harness = path.relative(path.join(root, 'test'), 'tools/check-module-boundaries.mjs');
  at('designated boundary test can load shared verifier', path.join(root, 'test/boundaries.test.mjs'), `import '${harness}';`);
  at('other tests cannot inherit shared verifier escape', testPath, `import '${harness}';`, '@nx/enforce-module-boundaries');
  at('designated boundary test cannot load arbitrary tools', path.join(root, 'test/boundaries.test.mjs'), `import '${path.relative(path.join(root, 'test'), 'tools/check-projects.mjs')}';`, '@nx/enforce-module-boundaries');
  if (name === 'api') {
    const consumer = path.join(root, 'test/library-consumption.test.mjs');
    at('designated API consumer can load its compiled fixture', consumer, "import '../../../dist/test-fixtures/api/consume-libraries.js';");
    at('API consumer cannot load another generated output', consumer, "import '../../../dist/apps/api/main.js';", 'qcrm/relative-import-policy');
    at('other API tests cannot inherit fixture output access', testPath, "import '../../../dist/test-fixtures/api/consume-libraries.js';", 'qcrm/relative-import-policy');
  }
  for (const [target, pkg] of Object.entries(libraries)) {
    if (target !== name) {
      const rule = mayImport(name, target) ? null : '@nx/enforce-module-boundaries';
      add(`${target} public root`, `import '${pkg}';`, rule);
      add(`${target} public type import`, `import type * as Types from '${pkg}';`, rule);
      add(`${target} public re-export`, `export * from '${pkg}';`, rule);
      let relative = path.relative(path.dirname(filePath), path.join(projectRoots[target], 'src/index.js'));
      if (!relative.startsWith('.')) relative = './' + relative;
      add(`${target} relative bypass`, `import '${relative}';`, '@nx/enforce-module-boundaries');
      add(`${target} absolute bypass`, `import '${path.join(workspaceRoot, projectRoots[target], 'src/index.ts')}';`, 'no-restricted-imports');
      add(`${target} file URL bypass`, `import 'file://${path.join(workspaceRoot, projectRoots[target], 'src/index.ts')}';`, 'no-restricted-imports');
      add(`${target} workspace-root bypass`, `import '${projectRoots[target]}/src/index.js';`, 'no-restricted-imports');
    }
    add(`${target} source deep import`, `import '${pkg}/src/index.js';`, 'no-restricted-imports');
    add(`${target} output deep import`, `import '${pkg}/dist/index.js';`, 'no-restricted-imports');
    add(`${target} deep type import`, `import type * as Types from '${pkg}/src/index.js';`, 'no-restricted-imports');
    add(`${target} deep re-export`, `export * from '${pkg}/src/index.js';`, 'no-restricted-imports');
  }
  for (const app of ['api', 'web'].filter((target) => target !== name)) {
    const relative = path.relative(path.dirname(filePath), path.join(projectRoots[app], 'src/main.js'));
    add(`${app} application implementation`, `import '${relative}';`, '@nx/enforce-module-boundaries');
  }
  return cases;
}

/** Lint virtual source in a real project; reject parser/config errors as evidence. */
export async function assertBoundaryCase(eslint, probe) {
  const results = await eslint.lintText(probe.code + '\n', { filePath: probe.filePath });
  assert.equal(results.length, 1, probe.name);
  const messages = results[0].messages;
  assert.ok(messages.every((message) => !message.fatal && message.ruleId), `${probe.name}: invalid lint probe: ${JSON.stringify(messages)}`);
  if (probe.rule) {
    assert.ok(messages.some((message) => message.ruleId === probe.rule && message.severity === 2), `${probe.name}: expected ${probe.rule}, got ${JSON.stringify(messages)}`);
  } else {
    assert.deepEqual(messages, [], `${probe.name}: allowed import rejected`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateProjects(readGraph().nodes);
  const eslint = new ESLint({ cwd: workspaceRoot });
  const cases = Object.keys(projectRoots).flatMap(boundaryCases);
  for (const probe of cases) await assertBoundaryCase(eslint, probe);
  console.log(JSON.stringify({ boundaryProbes: cases.length, allowed: cases.filter((probe) => !probe.rule).length, rejected: cases.filter((probe) => probe.rule).length }));
}
