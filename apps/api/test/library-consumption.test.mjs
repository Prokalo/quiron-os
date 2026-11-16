import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { loadedPackages } from '../../../dist/test-fixtures/api/consume-libraries.js';

const require = createRequire(import.meta.url);
const workspace = JSON.parse(readFileSync('package.json'));
for (const root of workspace.workspaces) {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json')));
  test(`${pkg.name}: API fixture loads the actual built public entrypoint`, () => {
    assert.equal(realpathSync(require.resolve(pkg.name)), path.resolve(root, 'dist/index.js'));
    assert.equal(loadedPackages[pkg.name], require(pkg.name));
    assert.deepEqual(Object.keys(pkg.exports), ['.']);
  });
  test(`${pkg.name}: Node rejects source, output, and package-metadata subpaths`, () => {
    for (const subpath of ['src/index.js', 'dist/index.js', 'package.json']) {
      assert.throws(() => require.resolve(`${pkg.name}/${subpath}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    }
  });
}

test('API consumer compilation disables source aliases', () => {
  const config = JSON.parse(readFileSync('apps/api/tsconfig.test.json'));
  const base = JSON.parse(readFileSync('tsconfig.base.json'));
  assert.deepEqual(config.compilerOptions.paths, {});
  assert.equal(base.compilerOptions.paths, undefined);
});
