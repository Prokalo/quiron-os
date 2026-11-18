import assert from 'node:assert/strict';
import test from 'node:test';
import { EVENT_ENVELOPE_SCHEMA_VERSION, createEventEnvelope } from '../dist/index.js';

test('public package exports the V1 schema version', () => {
  assert.equal(EVENT_ENVELOPE_SCHEMA_VERSION, 1);
});

test('creation gives simultaneous occurrences distinct domain-prefixed UUID v4 IDs', () => {
  const input = { eventType: 'lead.created', sourceDomain: 'seguros-marketing-leads', payload: {}, occurredAt: '2026-11-17T10:00:00Z' };
  const [first, second] = [createEventEnvelope(input), createEventEnvelope(input)];
  const idPattern = /^seguros-marketing-leads-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(first.eventId, idPattern);
  assert.match(second.eventId, idPattern);
  assert.notEqual(first.eventId, second.eventId);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.occurredAt, input.occurredAt);
  assert.deepEqual(first.payload, {});
  assert.equal(Object.hasOwn(first, 'correlationId'), false);
  assert.equal(Object.hasOwn(first, 'causationId'), false);
});

test('creation retains supplied optional tracing IDs', () => {
  const event = createEventEnvelope({ eventType: 'lead.created', sourceDomain: 'ambassadors', payload: {}, correlationId: 'trace-1', causationId: 'cause-1' });
  assert.equal(event.correlationId, 'trace-1');
  assert.equal(event.causationId, 'cause-1');
  assert.match(event.occurredAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
});
