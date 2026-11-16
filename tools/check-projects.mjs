import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const workspaceRoot = path.resolve(import.meta.dirname, '..');
export const projectRoots = {
  core: 'modules/core',
  ambassadors: 'modules/ambassadors',
  'tasks-agenda': 'modules/shared/tasks-agenda',
  'seguros-marketing-leads': 'modules/seguros/marketing-leads',
  api: 'apps/api',
  web: 'apps/web',
};

/** Validate the actual graph so Nx cannot silently skip missing test targets. */
export function validateProjects(nodes, root = workspaceRoot) {
  assert.deepEqual(Object.keys(nodes).sort(), Object.keys(projectRoots).sort(), 'Expected the six approved production projects');
  const outputs = [];
  for (const [name, node] of Object.entries(nodes)) {
    const data = node.data;
    assert.equal(data.root, projectRoots[name], `${name}: unexpected project root`);
    const layers = (data.tags ?? []).filter((tag) => tag.startsWith('layer:'));
    assert.deepEqual(layers, [name === 'api' || name === 'web' ? 'layer:app' : 'layer:module'], `${name}: invalid layer`);
    for (const target of ['lint', 'typecheck', 'build', 'test']) {
      assert.ok(data.targets?.[target], `${name}: missing ${target} target`);
    }
    const testTarget = data.targets.test;
    const runner = `node tools/test-project.mjs ${name}`;
    const command = name === 'api' ? `tsc -p apps/api/tsconfig.test.json && ${runner}` : runner;
    assert.equal(testTarget.executor, 'nx:run-commands', `${name}: invalid test executor`);
    // Closed command shapes avoid parsing shell text or accepting echoed commands,
    // alternate commands/arguments, readiness shortcuts, or another working directory.
    assert.deepEqual(testTarget.options, { command }, `${name}: invalid test invocation`);
    assert.equal(testTarget.cache, false, `${name}: test target must be uncached`);
    assert.notEqual(testTarget.continuous, true, `${name}: test target must complete`);
    assert.ok(Array.isArray(testTarget.dependsOn), `${name}: test must declare build dependencies`);
    for (const dependency of ['build', '^build']) {
      assert.ok(testTarget.dependsOn?.includes(dependency), `${name}: test must depend on ${dependency}`);
    }
    assert.ok(Array.isArray(data.targets.build.dependsOn) && data.targets.build.dependsOn.includes('^build'), `${name}: build must depend on ^build`);
    const files = readdirSync(path.join(root, data.root, 'test')).filter((file) => file.endsWith('.test.mjs'));
    assert.ok(files.length > 0, `${name}: no test files`);
    for (const output of data.targets.build.outputs ?? []) {
      outputs.push([name, path.resolve(root, output.replace('{workspaceRoot}', root).replace('{projectRoot}', data.root))]);
    }
  }
  for (const [index, [name, output]] of outputs.entries()) {
    for (const [other, candidate] of outputs.slice(index + 1)) {
      assert.ok(output !== candidate && !output.startsWith(candidate + path.sep) && !candidate.startsWith(output + path.sep), `${name}/${other}: overlapping build outputs`);
    }
  }
}

/** Ask the installed Nx CLI for a fresh graph; no duplicate graph implementation. */
export function readGraph(root = workspaceRoot) {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve('nx/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath));
  const bin = path.resolve(path.dirname(manifestPath), manifest.bin.nx);
  const graphFile = '.nx/workspace-data/verification-graph.json';
  execFileSync(process.execPath, [bin, 'graph', `--file=${graphFile}`], {
    cwd: root,
    env: { ...process.env, NX_DAEMON: 'false', NX_NO_CLOUD: 'true', NX_TUI: 'false' },
    timeout: 90_000,
    stdio: 'pipe',
  });
  return JSON.parse(readFileSync(path.join(root, graphFile))).graph;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateProjects(readGraph().nodes);
  console.log('Verified six projects: layers, lint/typecheck/build/test targets, test files, disjoint build outputs.');
}
