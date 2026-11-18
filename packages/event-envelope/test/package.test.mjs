import assert from 'node:assert/strict';
import test from 'node:test';
import { EVENT_ENVELOPE_SCHEMA_VERSION } from '../dist/index.js';

test('public package exports the V1 schema version', () => {
  assert.equal(EVENT_ENVELOPE_SCHEMA_VERSION, 1);
});
