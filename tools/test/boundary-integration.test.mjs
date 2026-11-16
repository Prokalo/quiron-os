import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readGraph, workspaceRoot } from '../check-projects.mjs';

const require = createRequire(import.meta.url);

test('real Nx/ESLint infrastructure edges and fail-closed negative controls', { timeout: 120_000 }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-boundaries-'));
  const env = { ...process.env, NX_DAEMON: 'false', NX_NO_CLOUD: 'true', NX_SKIP_NX_CACHE: 'true', NX_NATIVE_FILE_CACHE_DIRECTORY: path.join(dir, '.nx/native') };
  delete env.NODE_TEST_CONTEXT;
  const run = (args, input, extraEnv = {}, cwd = dir) => {
    const result = spawnSync(process.execPath, args, { cwd, env: { ...env, ...extraEnv }, input, encoding: 'utf8', timeout: 45_000 });
    assert.equal(result.error, undefined, result.error?.message);
    return { ...result, output: result.stdout + result.stderr };
  };
  const json = (file) => JSON.parse(readFileSync(path.join(dir, file)));
  const save = (file, value) => writeFileSync(path.join(dir, file), JSON.stringify(value, null, 2));
  try {
    // Copy the current worktree, including uncommitted remediation; never archive old HEAD.
    for (const item of ['apps', 'modules', 'tools', 'eslint.config.mjs', 'nx.json', 'package.json', 'tsconfig.json', 'tsconfig.base.json']) {
      cpSync(path.join(workspaceRoot, item), path.join(dir, item), {
        recursive: true,
        filter: (file) => !['node_modules', '.nx'].includes(path.basename(file)) && !path.basename(file).startsWith('.env'),
      });
    }
    // External tools are shared read-only by convention. Workspace links point into
    // the disposable copy, not back to production source or generated outputs.
    mkdirSync(path.join(dir, 'node_modules/@quiron'), { recursive: true });
    for (const entry of readdirSync(path.join(workspaceRoot, 'node_modules'))) {
      if (entry !== '@quiron' && entry !== '.cache') symlinkSync(path.join(workspaceRoot, 'node_modules', entry), path.join(dir, 'node_modules', entry));
    }
    const originalPackage = readFileSync(path.join(dir, 'package.json'), 'utf8');
    const workspace = json('package.json');
    const assertWorkspaceLinks = () => {
      for (const root of JSON.parse(originalPackage).workspaces) {
        const target = realpathSync(path.join(dir, 'node_modules', json(`${root}/package.json`).name));
        assert.equal(target, realpathSync(path.join(dir, root)), 'Workspace links must resolve into the disposable copy');
        assert.notEqual(target, realpathSync(path.join(workspaceRoot, root)), 'Workspace links must not consume original projects');
      }
    };
    for (const root of workspace.workspaces) {
      const pkg = json(`${root}/package.json`);
      symlinkSync(path.join(dir, root), path.join(dir, 'node_modules', pkg.name));
    }
    assertWorkspaceLinks();
    // A wrong link must fail before any fixture writes/builds use that link.
    const coreLink = path.join(dir, 'node_modules/@quiron/core');
    rmSync(coreLink);
    symlinkSync(path.join(workspaceRoot, 'modules/core'), coreLink);
    assert.throws(assertWorkspaceLinks, /Workspace links must resolve into the disposable copy/);
    rmSync(coreLink);
    symlinkSync(path.join(dir, 'modules/core'), coreLink);
    assertWorkspaceLinks();
    const eslintBin = path.resolve(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js');
    const lint = (file, code, rule = null) => {
      const result = run([eslintBin, '--stdin', '--stdin-filename', file, '--no-cache', '--format', 'json'], code);
      assert.ok(result.status === 0 || result.status === 1, result.output);
      const messages = JSON.parse(result.stdout)[0].messages;
      assert.ok(messages.every((message) => !message.fatal && message.ruleId), result.output);
      if (rule) assert.ok(messages.some((message) => message.ruleId === rule), result.output);
      else assert.deepEqual(messages, [], result.output);
    };
    for (const name of ['boundary-contract-fixture', 'boundary-infrastructure-fixture']) {
      const root = `packages/${name}`;
      mkdirSync(path.join(dir, root, 'src'), { recursive: true });
      save(`${root}/project.json`, {
        name, projectType: 'library', sourceRoot: `${root}/src`, tags: ['layer:infrastructure'],
        targets: { build: { executor: 'nx:run-commands', options: { command: `tsc -p ${root}/tsconfig.json` } } },
      });
      save(`${root}/package.json`, { name: `@quiron/${name}`, private: true, type: 'commonjs', exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } } });
      save(`${root}/tsconfig.json`, { extends: '../../tsconfig.base.json', compilerOptions: { rootDir: 'src', outDir: 'dist', declaration: true }, include: ['src/**/*.ts'] });
      writeFileSync(path.join(dir, root, 'src/index.ts'), 'export const boundaryMarker = true;\n');
      workspace.workspaces.push(root);
      symlinkSync(path.join(dir, root), path.join(dir, 'node_modules/@quiron', name));
      const compilerBin = path.resolve(path.dirname(require.resolve('typescript/package.json')), 'bin/tsc');
      const build = run([compilerBin, '-p', `${root}/tsconfig.json`]);
      assert.equal(build.status, 0, build.output);
    }
    save('package.json', workspace);
    const graph = readGraph(dir);
    assert.ok(graph.nodes['boundary-contract-fixture']);
    assert.ok(graph.nodes['boundary-infrastructure-fixture']);
    const contract = '@quiron/boundary-contract-fixture';
    const infrastructure = '@quiron/boundary-infrastructure-fixture';
    for (const source of ['modules/core/src/index.ts', 'modules/ambassadors/src/index.ts', 'modules/shared/tasks-agenda/src/index.ts', 'modules/seguros/marketing-leads/src/index.ts', 'apps/api/src/main.ts', 'apps/web/src/main.ts']) {
      lint(source, `import '${contract}';`);
      lint(source, `import type * as Contract from '${contract}';`);
      lint(source, `import '${contract}/src/index.js';`, 'no-restricted-imports');
    }
    lint('packages/boundary-infrastructure-fixture/src/index.ts', `import '${contract}';`);
    lint('packages/boundary-contract-fixture/src/index.ts', `import '${infrastructure}';`);
    for (const pkg of ['core', 'ambassadors', 'tasks-agenda', 'seguros-marketing-leads']) {
      lint('packages/boundary-contract-fixture/src/index.ts', `import '@quiron/${pkg}';`, '@nx/enforce-module-boundaries');
      lint('packages/boundary-contract-fixture/src/index.mjs', `import '@quiron/${pkg}';`, '@nx/enforce-module-boundaries');
      lint('packages/boundary-contract-fixture/src/index.mjs', `import '@quiron/${pkg}/src/index.js';`, 'no-restricted-imports');
    }
    lint('packages/boundary-infrastructure-fixture/src/index.mjs', `import '${contract}';`);
    lint('packages/boundary-contract-fixture/src/index.mjs', `import '${infrastructure}';`);
    lint('packages/boundary-infrastructure-fixture/entry.mjs', `import '${contract}';`);
    lint('packages/boundary-contract-fixture/entry.js', "import '@quiron/core';", '@nx/enforce-module-boundaries');
    lint('packages/boundary-contract-fixture/runtime/loader.mjs', "process['getBuiltinModule']('node:module');", 'no-restricted-properties');
    lint('packages/boundary-contract-fixture/test/tooling.mjs', "import { createRequire } from 'node:module';", null);
    lint('packages/boundary-contract-fixture/test/tooling.mjs', "import '@quiron/core';", '@nx/enforce-module-boundaries');
    lint('packages/boundary-contract-fixture/test/tooling.mjs', `import '${contract}/src/index.js';`, 'no-restricted-imports');
    lint('packages/boundary-contract-fixture/test/tooling.mjs', "import './helpers/local.mjs';");
    // Remove the test-only projects before exercising the actual six-project gate.
    writeFileSync(path.join(dir, 'package.json'), originalPackage);
    rmSync(path.join(dir, 'packages'), { recursive: true });
    for (const name of ['boundary-contract-fixture', 'boundary-infrastructure-fixture']) rmSync(path.join(dir, 'node_modules/@quiron', name));
    readGraph(dir);
    const baseline = run(['tools/check-module-boundaries.mjs']);
    assert.equal(baseline.status, 0, baseline.output);

    // Real executable files, not only virtual probes. Running from each project
    // directory also protects the root-anchored policy inherited by library configs.
    for (const root of [...json('package.json').workspaces, 'apps/api', 'apps/web']) {
      for (const extension of ['js', 'mjs', 'cjs']) {
        const file = path.join(dir, root, `__final_boundary__.${extension}`);
        assert.equal(existsSync(file), false);
        writeFileSync(file, "process.getBuiltinModule('node:module');\n");
        const rejected = run([eslintBin, file, '--no-cache', '--format', 'json'], undefined, {}, path.join(dir, root));
        assert.equal(rejected.status, 1, rejected.output);
        const messages = JSON.parse(rejected.stdout)[0].messages;
        assert.ok(messages.every((message) => !message.fatal && message.ruleId), rejected.output);
        assert.ok(messages.some((message) => message.ruleId === 'no-restricted-properties'), rejected.output);
        writeFileSync(file, 'console.log(process.env.QCRM_MODE);\n');
        const allowed = run([eslintBin, file, '--no-cache'], undefined, {}, path.join(dir, root));
        assert.equal(allowed.status, 0, allowed.output);
        rmSync(file);
      }
    }

    const configFile = path.join(dir, 'eslint.config.mjs');
    const config = readFileSync(configFile, 'utf8');
    const weakened = config.replace("sourceTag: 'layer:module',\n              onlyDependOnLibsWithTags: ['layer:infrastructure']", "sourceTag: 'layer:module',\n              onlyDependOnLibsWithTags: ['layer:module', 'layer:infrastructure']");
    assert.notEqual(weakened, config, 'Layer mutation must modify the real configuration');
    writeFileSync(configFile, weakened);
    const layerControl = run(['tools/check-module-boundaries.mjs']);
    assert.notEqual(layerControl.status, 0, layerControl.output);
    assert.match(layerControl.output, /expected @nx\/enforce-module-boundaries/);
    writeFileSync(configFile, config.replace("'no-restricted-imports': ['error'", "'no-restricted-imports': ['off'"));
    const deepControl = run(['--input-type=module', '-e', "import { ESLint } from 'eslint'; import { assertBoundaryCase, boundaryCases } from './tools/check-module-boundaries.mjs'; await assertBoundaryCase(new ESLint(), boundaryCases('api').find((p) => p.name === 'core source deep import'));" ]);
    assert.notEqual(deepControl.status, 0, deepControl.output);
    assert.match(deepControl.output, /expected no-restricted-imports/);
    writeFileSync(configFile, config);
    for (const [rule, probeName] of [
      ['qcrm/static-runtime-access', 'opaque process alias'],
      ['no-restricted-properties', 'builtin module loader escape'],
      ['qcrm/relative-import-policy', 'production cannot load privileged test helper'],
      ['qcrm/relative-import-policy', 'production own generated output'],
    ]) {
      const control = run(['--input-type=module', '-e', `import { ESLint } from 'eslint'; import { assertBoundaryCase, boundaryCases } from './tools/check-module-boundaries.mjs'; await assertBoundaryCase(new ESLint({overrideConfig:{rules:{'${rule}':'off'}}}), boundaryCases('api').find((p) => p.name === '${probeName}'));`]);
      assert.notEqual(control.status, 0, control.output);
      assert.ok(control.output.includes(`expected ${rule}`), control.output);
    }
    for (const [rule, probeName] of [
      ['@nx/enforce-module-boundaries', 'test mjs ambassadors public root'],
      ['no-restricted-imports', 'test mjs core deep import'],
    ]) {
      const control = run(['--input-type=module', '-e', `import { ESLint } from 'eslint'; import { assertBoundaryCase, boundaryCases } from './tools/check-module-boundaries.mjs'; await assertBoundaryCase(new ESLint({overrideConfig:{rules:{'${rule}':'off'}}}), boundaryCases('core').find((p) => p.name === '${probeName}'));`]);
      assert.notEqual(control.status, 0, control.output);
      assert.ok(control.output.includes(`expected ${rule}`), control.output);
    }
    const narrowed = config.replace("'{apps,modules,packages}/**/*.{js,mjs,cjs,jsx}'", "'{apps,modules,packages}/**/src/**/*.{js,mjs,cjs,jsx}'");
    assert.notEqual(narrowed, config, 'Coverage mutation must change the real config');
    writeFileSync(configFile, narrowed);
    const coverageControl = run(['--input-type=module', '-e', "import { ESLint } from 'eslint'; import { assertBoundaryCase, boundaryCases } from './tools/check-module-boundaries.mjs'; await assertBoundaryCase(new ESLint(), boundaryCases('api').find((p) => p.name === 'project-root mjs rejects deep imports'));" ]);
    assert.notEqual(coverageControl.status, 0, coverageControl.output);
    assert.match(coverageControl.output, /expected no-restricted-imports/);
    writeFileSync(configFile, config);

    const illegal = path.join(dir, 'modules/ambassadors/src/illegal.ts');
    writeFileSync(illegal, "import '@quiron/core';\n");
    const illegalControl = run([eslintBin, 'modules/ambassadors/src/illegal.ts', '--no-cache']);
    assert.equal(illegalControl.status, 1, illegalControl.output);
    assert.match(illegalControl.output, /@nx\/enforce-module-boundaries/);
    const missingGraphEnv = { NX_WORKSPACE_DATA_DIRECTORY: path.join(dir, '.nx/no-graph') };
    writeFileSync(configFile, config.replace("'@nx': failClosedNx", "'@nx': nx"));
    const nativeSkip = run([eslintBin, 'modules/ambassadors/src/illegal.ts', '--no-cache'], undefined, missingGraphEnv);
    assert.equal(nativeSkip.status, 0, nativeSkip.output);
    assert.match(nativeSkip.output, /rule will be skipped/);
    writeFileSync(configFile, config);
    const graphControl = run([eslintBin, 'modules/ambassadors/src/illegal.ts', '--no-cache'], undefined, missingGraphEnv);
    assert.equal(graphControl.status, 1, graphControl.output);
    assert.match(graphControl.output, /Nx project graph unavailable/);
    rmSync(illegal);
    const coreTests = path.join(dir, 'modules/core/test');
    rmSync(coreTests, { recursive: true });
    mkdirSync(coreTests);
    const missingTests = run(['tools/test-project.mjs', 'core']);
    assert.notEqual(missingTests.status, 0, missingTests.output);
    assert.match(missingTests.output, /no test files/);
    cpSync(path.join(workspaceRoot, 'modules/core/test'), coreTests, { recursive: true });
    const coreProjectFile = path.join(dir, 'modules/core/project.json');
    const coreProject = readFileSync(coreProjectFile, 'utf8');
    const missing = JSON.parse(coreProject);
    delete missing.targets.test;
    save('modules/core/project.json', missing);
    const missingTarget = run(['tools/check-projects.mjs']);
    assert.notEqual(missingTarget.status, 0, missingTarget.output);
    assert.match(missingTarget.output, /core: missing test target/);
    const echoed = JSON.parse(coreProject);
    echoed.targets.test.options.command = 'echo node tools/test-project.mjs core';
    save('modules/core/project.json', echoed);
    const echoControl = run(['tools/check-projects.mjs']);
    assert.notEqual(echoControl.status, 0, echoControl.output);
    assert.match(echoControl.output, /core: invalid test invocation/);
    const unordered = JSON.parse(coreProject);
    unordered.targets.test.dependsOn = [];
    save('modules/core/project.json', unordered);
    const orderingControl = run(['tools/check-projects.mjs']);
    assert.notEqual(orderingControl.status, 0, orderingControl.output);
    assert.match(orderingControl.output, /core: test must depend on build/);
    writeFileSync(coreProjectFile, coreProject);
    const fixtureFile = path.join(dir, 'apps/api/test/fixtures/consume-libraries.ts');
    const fixture = readFileSync(fixtureFile, 'utf8');
    const withFixture = readGraph(dir);
    assert.deepEqual(withFixture.dependencies.api.map((edge) => edge.target).sort(), ['ambassadors', 'core', 'seguros-marketing-leads', 'tasks-agenda']);
    rmSync(fixtureFile);
    assert.deepEqual(readGraph(dir).dependencies.api, [], 'API graph edges are test-fixture imports, not production composition');
    writeFileSync(fixtureFile, fixture);
    const restored = run(['tools/check-module-boundaries.mjs']);
    assert.equal(restored.status, 0, restored.output);
    assertWorkspaceLinks();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    assert.equal(existsSync(dir), false, 'The actual allocated fixture directory must be removed');
  }
});
