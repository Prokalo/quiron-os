import assert from 'node:assert/strict';
import test from 'node:test';
import { EVENT_ENVELOPE_SCHEMA_VERSION, EventEnvelopeValidationError, createEventEnvelope, deserializeEventEnvelope, serializeEventEnvelope, validateEventEnvelope } from '../dist/index.js';

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

test('metadata validation accepts the domain grammar and explicit timezone offsets', () => {
  for (const domain of ['core', 'tasks-agenda', 'seguros-marketing-leads', 'bp.sales']) {
    const event = createEventEnvelope({ eventType: 'record.created', sourceDomain: domain, payload: {}, occurredAt: '2024-02-29T23:59:59.123+05:30' });
    assert.strictEqual(validateEventEnvelope(event), event);
  }
});

test('metadata validation rejects missing, null, unknown, and invalid fields', () => {
  const valid = createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: {}, occurredAt: '2024-02-29T23:59:59Z' });
  for (const field of ['eventId', 'eventType', 'sourceDomain', 'occurredAt', 'payload', 'schemaVersion']) {
    const missing = { ...valid };
    delete missing[field];
    assert.throws(() => validateEventEnvelope(missing), (error) => error instanceof EventEnvelopeValidationError && error.field === field);
    assert.throws(() => validateEventEnvelope({ ...valid, [field]: null }), EventEnvelopeValidationError);
  }
  assert.throws(() => validateEventEnvelope({ ...valid, extra: 'secret' }), (error) => error.code === 'unknown_field' && !error.message.includes('secret'));
  assert.throws(() => createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: {}, extra: 'secret' }), (error) => error.code === 'unknown_field' && !error.message.includes('secret'));
  for (const version of [0, 2, 1.5, '1']) {
    assert.throws(() => validateEventEnvelope({ ...valid, schemaVersion: version }), (error) => error.field === 'schemaVersion');
  }
  for (const domain of ['', 'Core', 'a..b', 'a-', '-a', 'a_b', 'a b']) {
    assert.throws(() => createEventEnvelope({ eventType: 'record.created', sourceDomain: domain, payload: {} }), (error) => error.field === 'sourceDomain');
  }
  for (const eventId of ['other-' + valid.eventId.slice(5), 'core-not-a-uuid', 'core-00000000-0000-1000-8000-000000000000']) {
    assert.throws(() => validateEventEnvelope({ ...valid, eventId }), (error) => error.field === 'eventId');
  }
  for (const occurredAt of ['2024-02-30T00:00:00Z', '2023-02-29T00:00:00Z', '2024-01-01T00:00:00', '2024-01-01T25:00:00Z', '2024-01-01T00:00:00+24:00']) {
    assert.throws(() => validateEventEnvelope({ ...valid, occurredAt }), (error) => error.field === 'occurredAt');
  }
  for (const field of ['correlationId', 'causationId']) {
    assert.throws(() => validateEventEnvelope({ ...valid, [field]: '' }), (error) => error.field === field);
  }
});

test('serialization preserves nested JSON payload values and empty objects', () => {
  const payload = { empty: {}, nested: [{ amount: 0, active: false, note: null }, 'value'] };
  const event = createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload });
  assert.deepEqual(JSON.parse(serializeEventEnvelope(event)).payload, payload);
});

test('payload validation rejects values JSON would drop or change', () => {
  const cyclic = {};
  cyclic.self = cyclic;
  const sparse = [];
  sparse[1] = 'value';
  const extraArrayProperty = ['value'];
  extraArrayProperty.extra = 'hidden';
  const hidden = {};
  Object.defineProperty(hidden, 'secret', { value: 'private', enumerable: false });
  const getter = {};
  Object.defineProperty(getter, 'secret', { get: () => 'private', enumerable: true });
  const values = [undefined, () => 1, Symbol('secret'), 1n, NaN, Infinity, -Infinity, -0, cyclic, sparse, extraArrayProperty, hidden, getter, new Date()];
  for (const value of values) {
    assert.throws(
      () => createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: { value } }),
      (error) => error instanceof EventEnvelopeValidationError && error.field === 'payload' && !error.message.includes('private'),
    );
  }
  assert.throws(() => createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: [] }), (error) => error.field === 'payload');
});

test('validation errors never echo sensitive payload or metadata values', () => {
  const event = createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: { secret: 'credential-value' } });
  const invalid = { ...event, eventType: '', payload: { secret: 'credential-value' } };
  assert.throws(() => serializeEventEnvelope(invalid), (error) =>
    error instanceof EventEnvelopeValidationError && !error.message.includes('credential-value') && !error.message.includes('record.created'));
});

test('JSON round trips preserve every field and the existing event identity', () => {
  const event = createEventEnvelope({
    eventType: 'record.created',
    sourceDomain: 'bp.sales',
    occurredAt: '2024-02-29T23:59:59.123+05:30',
    payload: { nested: [{ amount: 3, active: true }, null] },
    correlationId: 'trace-1',
    causationId: 'cause-1',
  });
  const read = deserializeEventEnvelope(serializeEventEnvelope(event));
  assert.deepEqual(read, event);
  assert.equal(read.eventId, event.eventId);
  assert.strictEqual(validateEventEnvelope(event), event);
  const noTracing = createEventEnvelope({ eventType: 'record.created', sourceDomain: 'core', payload: {} });
  assert.deepEqual(deserializeEventEnvelope(serializeEventEnvelope(noTracing)), noTracing);
  assert.equal(Object.hasOwn(deserializeEventEnvelope(serializeEventEnvelope(noTracing)), 'correlationId'), false);
});

test('deserialization rejects malformed or invalid JSON without leaking contents', () => {
  for (const json of ['{ "secret": "credential-value",', '[]', 'null', '{"payload":{"secret":"credential-value"}}']) {
    assert.throws(() => deserializeEventEnvelope(json), (error) =>
      error instanceof EventEnvelopeValidationError && !error.message.includes('credential-value'));
  }
  assert.throws(() => deserializeEventEnvelope(42), (error) => error.field === 'json');
});
