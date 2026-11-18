import test from 'node:test';
import { ESLint } from 'eslint';
import { assertBoundaryCase, boundaryCases } from '../../../tools/check-module-boundaries.mjs';

const eslint = new ESLint({ cwd: process.cwd() });
for (const probe of boundaryCases('event-envelope')) {
  test('event-envelope: ' + probe.name, async () => {
    await assertBoundaryCase(eslint, probe);
  });
}
