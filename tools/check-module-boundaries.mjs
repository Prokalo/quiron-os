import { rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(
  workspaceRoot,
  'modules/ambassadors/src',
  `boundary-violation-${process.pid}.ts`,
);
const fixtureSource = "import '@quiron/seguros-marketing-leads';\n";
let fixtureCreated = false;

try {
  await writeFile(fixturePath, fixtureSource, { flag: 'wx' });
  fixtureCreated = true;

  const result = spawnSync(
    path.join(workspaceRoot, 'node_modules/.bin/eslint'),
    [fixturePath, '--no-cache', '--format', 'json'],
    { cwd: workspaceRoot, encoding: 'utf8' },
  );

  const reports = result.stdout ? JSON.parse(result.stdout) : [];
  const boundaryViolation = reports
    .flatMap((report) => report.messages ?? [])
    .find((message) => message.ruleId === '@nx/enforce-module-boundaries');

  if (result.status !== 1 || !boundaryViolation) {
    console.error('Expected ESLint to reject a domain-to-domain import.');
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = 1;
  } else {
    console.log(`Boundary guardrail verified: ${boundaryViolation.message}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (fixtureCreated) {
    await rm(fixturePath, { force: true });
  }
}
