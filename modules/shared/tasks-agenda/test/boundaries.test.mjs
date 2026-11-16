import test from 'node:test';
import { ESLint } from 'eslint';
import { assertBoundaryCase, boundaryCases } from '../../../../tools/check-module-boundaries.mjs';

const eslint = new ESLint({ cwd: process.cwd() });
for (const probe of boundaryCases('tasks-agenda')) {
  test('tasks-agenda: ' + probe.name, async () => {
    await assertBoundaryCase(eslint, probe);
  });
}
