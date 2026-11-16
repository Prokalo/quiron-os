import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { projectRoots, readGraph, validateProjects, workspaceRoot } from '../check-projects.mjs';
import { discoverTestFiles } from '../test-project.mjs';

const graph = readGraph();
// A nested CLI is a new test run, not a worker of the parent node:test process.
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
test('actual graph passes the mandatory verification preflight', () => {
  validateProjects(graph.nodes);
});
test('preflight fails if any real project loses its test target', () => {
  for (const name of Object.keys(graph.nodes)) {
    const nodes = structuredClone(graph.nodes);
    delete nodes[name].data.targets.test;
    assert.throws(() => validateProjects(nodes), new RegExp(`${name}: missing test target`));
  }
});
test('preflight rejects missing, contradictory, or misclassified layers', () => {
  for (const tags of [[], ['layer:module', 'layer:infrastructure'], ['layer:infrastructure']]) {
    const nodes = structuredClone(graph.nodes);
    nodes.core.data.tags = tags;
    assert.throws(() => validateProjects(nodes), /core: invalid layer/);
  }
});
test('preflight rejects unexpected projects', () => {
  const nodes = structuredClone(graph.nodes);
  nodes.unapproved = structuredClone(nodes.core);
  assert.throws(() => validateProjects(nodes), /six approved production projects/);
});
test('preflight fails on empty project test discovery', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-no-tests-'));
  try {
    for (const root of Object.values(projectRoots)) mkdirSync(path.join(dir, root, 'test'), { recursive: true });
    assert.throws(() => validateProjects(graph.nodes, dir), /no test files/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('preflight rejects overlapping output ownership', () => {
  const nodes = structuredClone(graph.nodes);
  nodes.ambassadors.data.targets.build.outputs = nodes.core.data.targets.build.outputs.map((p) => p.replace('{projectRoot}', projectRoots.core));
  assert.throws(() => validateProjects(nodes), /overlapping build outputs/);
});

test('preflight rejects echoed, commented, or wrapped test invocations', () => {
  for (const name of Object.keys(graph.nodes)) {
    const original = graph.nodes[name].data.targets.test.options.command;
    for (const command of [`echo ${original}`, `printf '${original}'`, `true # ${original}`, `${original} || true`]) {
      const nodes = structuredClone(graph.nodes);
      nodes[name].data.targets.test.options.command = command;
      assert.throws(() => validateProjects(nodes), new RegExp(`${name}: invalid test invocation`));
    }
  }
});
test('preflight rejects alternate executors and execution-shortcut options', () => {
  for (const name of Object.keys(graph.nodes)) {
    const nodes = structuredClone(graph.nodes);
    nodes[name].data.targets.test.executor = 'nx:noop';
    assert.throws(() => validateProjects(nodes), /invalid test executor/);
    for (const option of [{ commands: ['echo skipped'] }, { cwd: 'elsewhere' }, { readyWhen: 'ready' }, { args: '--help' }]) {
      const changed = structuredClone(graph.nodes);
      Object.assign(changed[name].data.targets.test.options, option);
      assert.throws(() => validateProjects(changed), /invalid test invocation/);
    }
  }
});
test('preflight requires local and dependency builds before every test', () => {
  for (const name of Object.keys(graph.nodes)) {
    for (const dependency of ['build', '^build']) {
      const nodes = structuredClone(graph.nodes);
      nodes[name].data.targets.test.dependsOn = nodes[name].data.targets.test.dependsOn.filter((entry) => entry !== dependency);
      assert.throws(() => validateProjects(nodes), /test must depend on/);
    }
  }
});
test('preflight requires dependency build ordering and uncached finite tests', () => {
  for (const name of Object.keys(graph.nodes)) {
    const nodes = structuredClone(graph.nodes);
    nodes[name].data.targets.build.dependsOn = [];
    assert.throws(() => validateProjects(nodes), /build must depend on \^build/);
    for (const dependsOn of [undefined, 'build ^build']) {
      const changed = structuredClone(graph.nodes);
      changed[name].data.targets.test.dependsOn = dependsOn;
      assert.throws(() => validateProjects(changed), /test must declare build dependencies/);
    }
    for (const invalid of [{ cache: true }, { continuous: true }]) {
      const changed = structuredClone(graph.nodes);
      Object.assign(changed[name].data.targets.test, invalid);
      assert.throws(() => validateProjects(changed), /must be uncached|must complete/);
    }
  }
});

for (const [label, source, success] of [
  ['empty file', '', false],
  ['skipped-only file', "import test from 'node:test'; test.skip('not executed', () => {});", false],
  ['TODO-only file', "import test from 'node:test'; test.todo('not implemented');", false],
  ['failing TODO-only file', "import test from 'node:test'; test('not implemented', {todo: true}, () => { throw new Error('unfinished'); });", false],
  ['dynamic TODO-only file', "import test from 'node:test'; test('unfinished', (t) => { t.todo('pending'); });", false],
  ['empty suite', "import {describe} from 'node:test'; describe('empty', () => {});", false],
  ['failed assertion', "import test from 'node:test'; import assert from 'node:assert/strict'; test('broken', () => assert.fail('negative control'));", false],
  ['executed test', "import test from 'node:test'; test('real execution', () => { console.log('success-path-executed'); });", true],
]) {
  test(`native test guard: ${label}`, () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-test-control-'));
    try {
      const file = path.join(dir, 'control.test.mjs');
      writeFileSync(file, source);
      const runner = path.join(dir, 'run.mjs');
      const runnerUrl = pathToFileURL(path.join(workspaceRoot, 'tools/test-project.mjs')).href;
      writeFileSync(runner, `import {runTestFiles} from '${runnerUrl}'; await runTestFiles(${JSON.stringify([file])});`);
      const result = spawnSync(process.execPath, [runner], { encoding: 'utf8', timeout: 15_000, env: childEnv });
      assert.equal(result.error, undefined);
      assert.equal(result.status === 0, success, result.stdout + result.stderr);
      if (label === 'executed test') assert.match(result.stdout, /success-path-executed/);
      if (label !== 'executed test' && label !== 'failed assertion') assert.match(result.stdout + result.stderr, /at least one non-skipped, non-TODO test/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
test('checked discovery rejects the unmatched-glob gap in the native runner', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-missing-test-'));
  try {
    assert.throws(() => discoverTestFiles(dir), /no test files/);
    writeFileSync(path.join(dir, 'real.test.mjs'), "import test from 'node:test'; test('real', () => {});");
    assert.deepEqual(discoverTestFiles(dir), [path.join(dir, 'real.test.mjs')]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a passing file cannot conceal a TODO-only sibling file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-mixed-tests-'));
  try {
    const passing = path.join(dir, 'passing.test.mjs');
    const pending = path.join(dir, 'pending.test.mjs');
    writeFileSync(passing, "import test from 'node:test'; test('real execution', () => {});");
    writeFileSync(pending, "import test from 'node:test'; test.todo('unfinished');");
    const runner = path.join(dir, 'run.mjs');
    const runnerUrl = pathToFileURL(path.join(workspaceRoot, 'tools/test-project.mjs')).href;
    writeFileSync(runner, `import {runTestFiles} from '${runnerUrl}'; await runTestFiles(${JSON.stringify([passing, pending])});`);
    const result = spawnSync(process.execPath, [runner], { encoding: 'utf8', timeout: 15_000, env: childEnv });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /pending.test.mjs: must pass at least one non-skipped, non-TODO test/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
