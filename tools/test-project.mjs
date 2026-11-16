import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';
import { projectRoots, workspaceRoot } from './check-projects.mjs';

/** Node 22 accepts unmatched test globs; pass a checked, explicit file list. */
export function discoverTestFiles(root) {
  const files = readdirSync(root).filter((file) => file.endsWith('.test.mjs')).sort().map((file) => path.join(root, file));
  assert.ok(files.length > 0, `${root}: no test files`);
  return files;
}

/** Use native per-file summaries, excluding TODO/skip and implicit file passes. */
export async function runTestFiles(files) {
  assert.ok(files.length > 0, 'No test files');
  const summarized = new Set();
  const failEmpty = (file) => {
    console.error(`${file}: must pass at least one non-skipped, non-TODO test`);
    process.exitCode = 1;
  };
  const stream = run({ files, execArgv: [], timeout: 120_000 });
  stream.on('test:summary', ({ file, counts, success }) => {
    if (!success) process.exitCode = 1;
    if (file) {
      summarized.add(path.resolve(file));
      if (counts.tests === 0 || counts.passed === 0) failEmpty(file);
    }
  });
  for await (const chunk of stream.compose(tap)) process.stdout.write(chunk);
  for (const file of files) {
    if (!summarized.has(path.resolve(file))) failEmpty(file);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const project = process.argv[2];
  const root = project === 'tools' ? 'tools' : projectRoots[project];
  assert.ok(root, `Unknown test project: ${project}`);
  const files = discoverTestFiles(path.join(workspaceRoot, root, 'test'));
  await runTestFiles(files);
}
