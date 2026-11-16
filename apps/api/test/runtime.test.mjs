import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

async function unusedPort() {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  return port;
}

/** Start the unchanged API, retrying only a confirmed bind race, with bounded cleanup. */
async function startApi(t, { getPort = unusedPort, nodeArgs = [], maxAttempts = 3 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const port = await getPort();
    const child = spawn(process.execPath, [...nodeArgs, 'dist/apps/api/main.js'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const closed = new Promise((resolve) => child.once('close', resolve));
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    const stop = async () => {
      let escalation;
      if (child.pid && child.exitCode === null && child.signalCode === null) {
        child.kill();
        escalation = setTimeout(() => child.kill('SIGKILL'), 1_000);
        escalation.unref();
      }
      await closed;
      clearTimeout(escalation);
    };
    t.after(stop);
    try {
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          clearTimeout(timer);
          child.off('error', onError);
          child.off('close', onClose);
          child.stdout.off('data', onData);
          if (error) reject(error);
          else resolve();
        };
        const onError = (error) => finish(error);
        const onClose = (code, signal) => {
          const error = new Error(`API exited before readiness (${code ?? signal}): ${stderr}`);
          // Waiting for close, not exit, captures the complete stderr diagnostic.
          if (code !== 0 && /\bEADDRINUSE\b/.test(stderr)) error.code = 'EADDRINUSE';
          finish(error);
        };
        const onData = () => {
          if (stdout.includes(`listening on port ${port}`)) finish();
        };
        const timer = setTimeout(() => finish(new Error(`API readiness timeout: ${stdout}\n${stderr}`)), 3_000);
        child.once('error', onError);
        child.once('close', onClose);
        child.stdout.on('data', onData);
      });
      return { child, port, attempt, stderr: () => stderr };
    } catch (error) {
      await stop();
      if (error.code !== 'EADDRINUSE' || attempt === maxAttempts) throw error;
    }
  }
  throw new Error('API startup requires at least one attempt');
}

test('API preserves its health, method, query, and not-found behavior', { timeout: 15_000 }, async (t) => {
  const api = await startApi(t);
  for (const [method, route, status, body] of [
    ['GET', '/health', 200, { status: 'ok', app: 'api' }],
    ['GET', '/health?probe=1', 200, { status: 'ok', app: 'api' }],
    ['POST', '/health', 200, { status: 'ok', app: 'api' }],
    ['GET', '/', 404, { error: 'not_found' }],
    ['GET', '/leads', 404, { error: 'not_found' }],
  ]) {
    assert.equal(api.child.exitCode, null, api.stderr());
    const response = await fetch(`http://127.0.0.1:${api.port}${route}`, { method, signal: AbortSignal.timeout(2_000) });
    assert.equal(response.status, status, `${method} ${route}`);
    assert.equal(response.headers.get('content-type'), 'application/json');
    assert.deepEqual(await response.json(), body);
  }
  assert.equal(api.child.exitCode, null, api.stderr());
});

test('API startup recovers from an actual port collision', { timeout: 15_000 }, async (t) => {
  const occupied = createServer();
  occupied.listen(0);
  await once(occupied, 'listening');
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  let attempts = 0;
  const api = await startApi(t, { getPort: () => ++attempts === 1 ? occupied.address().port : unusedPort() });
  assert.equal(api.attempt, 2);
  const response = await fetch(`http://127.0.0.1:${api.port}/health`, { signal: AbortSignal.timeout(2_000) });
  assert.deepEqual(await response.json(), { status: 'ok', app: 'api' });
});

test('API startup fails after bounded port-collision retries', { timeout: 15_000 }, async (t) => {
  const occupied = createServer();
  occupied.listen(0);
  await once(occupied, 'listening');
  t.after(() => new Promise((resolve) => occupied.close(resolve)));
  let attempts = 0;
  await assert.rejects(startApi(t, { maxAttempts: 2, getPort: () => { attempts += 1; return occupied.address().port; } }), { code: 'EADDRINUSE' });
  assert.equal(attempts, 2);
});

test('harmless stderr warnings do not reject a healthy API', { timeout: 15_000 }, async (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qcrm-api-warning-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const preload = path.join(dir, 'warning.cjs');
  writeFileSync(preload, "process.emitWarning('harmless startup warning', { code: 'QCRM_TEST_WARNING' });\n");
  const api = await startApi(t, { nodeArgs: ['--require', preload] });
  const response = await fetch(`http://127.0.0.1:${api.port}/health`, { signal: AbortSignal.timeout(2_000) });
  assert.deepEqual(await response.json(), { status: 'ok', app: 'api' });
  assert.match(api.stderr(), /QCRM_TEST_WARNING/);
});

test('non-collision API startup failures are not retried or ignored', { timeout: 15_000 }, async (t) => {
  let attempts = 0;
  await assert.rejects(startApi(t, { getPort: () => { attempts += 1; return 'invalid-port'; } }), /ERR_SOCKET_BAD_PORT/);
  assert.equal(attempts, 1);
});
