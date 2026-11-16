import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });
for (const [rule, code, filePath] of [
  ['no-undef', 'missingFunction();', 'tools/check-projects.mjs'],
  ['no-unused-vars', 'const unused = 1;', 'tools/test/verification.test.mjs'],
  ['no-unreachable', 'function example() { return; console.log("unreachable"); } example();', 'tools/check-module-boundaries.mjs'],
  ['no-dupe-keys', 'export const options = { enabled: true, enabled: false };', 'tools/check-projects.mjs'],
  ['valid-typeof', 'export const invalid = typeof process === "strnig";', 'eslint.config.mjs'],
  ['no-async-promise-executor', 'export const pending = new Promise(async (resolve) => { resolve(); });', 'tools/test-project.mjs'],
]) {
  test(`tooling lint rejects a validly parsed ${rule} violation`, async () => {
    const [result] = await eslint.lintText(code, { filePath });
    assert.equal(result.fatalErrorCount, 0);
    assert.ok(result.messages.some((message) => message.ruleId === rule && message.severity === 2), JSON.stringify(result.messages));
  });
}

test('tooling lint permits valid Node tooling', async () => {
  const [result] = await eslint.lintText("import path from 'node:path'; export const filename = path.basename('/project/file');", { filePath: 'tools/__lint_probe__.mjs' });
  assert.deepEqual(result.messages, []);
});
