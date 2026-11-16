import test from 'node:test';
import { ESLint } from 'eslint';
import { assertBoundaryCase, boundaryCases } from '../../../tools/check-module-boundaries.mjs';

const eslint = new ESLint({ cwd: process.cwd() });
for (const probe of boundaryCases('ambassadors')) {
  test('ambassadors: ' + probe.name, async () => {
    await assertBoundaryCase(eslint, probe);
  });
}
