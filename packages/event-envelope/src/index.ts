/** Version of the shared event envelope contract. */
export const EVENT_ENVELOPE_SCHEMA_VERSION = 1 as const;

/** JSON transport shape shared by event publishers and consumers. */
export interface EventEnvelopeV1 {
  readonly eventId: string;
  readonly eventType: string;
  readonly sourceDomain: string;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
  readonly schemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION;
  readonly correlationId?: string;
  readonly causationId?: string;
}

/** Fields a publisher supplies for a new event occurrence. */
export interface CreateEventEnvelopeInput {
  readonly eventType: string;
  readonly sourceDomain: string;
  readonly payload: Record<string, unknown>;
  readonly occurredAt?: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

/** Identifiable validation failure without echoing event data. */
export class EventEnvelopeValidationError extends Error {
  constructor(
    readonly field: string,
    readonly code: string,
  ) {
    super(`Invalid event envelope: ${field} (${code})`);
    this.name = 'EventEnvelopeValidationError';
  }
}

const sourceDomainPattern = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const requiredFields = ['eventId', 'eventType', 'sourceDomain', 'occurredAt', 'payload', 'schemaVersion'] as const;
const allowedFields = new Set<string>([...requiredFields, 'correlationId', 'causationId']);
const creationFields = new Set<string>(['eventType', 'sourceDomain', 'payload', 'occurredAt', 'correlationId', 'causationId']);

function fail(field: string, code: string): never {
  throw new EventEnvelopeValidationError(field, code);
}

function isValidTimestamp(value: string): boolean {
  const match = timestampPattern.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > days[month - 1]!) return false;
  if (zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return true;
}

/** Reject values that JSON would silently drop, coerce, or change during transport. */
function validatePayload(value: unknown): void {
  const pending: Array<{ value: unknown; leaving: boolean }> = [{ value, leaving: false }];
  const active = new WeakSet<object>();
  while (pending.length) {
    const item = pending.pop()!;
    const current = item.value;
    if (item.leaving) {
      active.delete(current as object);
      continue;
    }
    if (current === null || typeof current === 'string' || typeof current === 'boolean') continue;
    if (typeof current === 'number') {
      if (!Number.isFinite(current) || Object.is(current, -0)) fail('payload', 'invalid_value');
      continue;
    }
    if (typeof current !== 'object') fail('payload', 'invalid_value');
    if (active.has(current)) fail('payload', 'cyclic_value');
    active.add(current);
    pending.push({ value: current, leaving: true });
    if (!Array.isArray(current) && Object.getPrototypeOf(current) !== Object.prototype) fail('payload', 'invalid_type');
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index++) {
        if (!Object.hasOwn(current, index)) fail('payload', 'invalid_value');
      }
    }
    for (const key of Reflect.ownKeys(current)) {
      if (Array.isArray(current) && key === 'length') continue;
      if (typeof key !== 'string' || (Array.isArray(current) && !/^(0|[1-9]\d*)$/.test(key))) fail('payload', 'invalid_value');
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) fail('payload', 'invalid_value');
      pending.push({ value: descriptor.value, leaving: false });
    }
  }
}

/** Validate V1 metadata and return the original envelope without changing its identity. */
export function validateEventEnvelope(value: unknown): EventEnvelopeV1 {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('envelope', 'invalid_type');
  }
  const fields = value as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!Object.hasOwn(fields, field) || fields[field] === null) fail(field, 'required');
  }
  for (const field of Reflect.ownKeys(fields)) {
    if (typeof field !== 'string' || !allowedFields.has(field)) fail('envelope', 'unknown_field');
    const descriptor = Object.getOwnPropertyDescriptor(fields, field);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) fail('envelope', 'invalid_value');
  }
  if (typeof fields['eventType'] !== 'string' || !fields['eventType'].trim()) fail('eventType', 'invalid_value');
  if (typeof fields['sourceDomain'] !== 'string' || !sourceDomainPattern.test(fields['sourceDomain'])) fail('sourceDomain', 'invalid_value');
  if (typeof fields['eventId'] !== 'string' || !fields['eventId'].startsWith(fields['sourceDomain'] + '-') ||
      !uuidV4Pattern.test(fields['eventId'].slice(fields['sourceDomain'].length + 1))) fail('eventId', 'invalid_value');
  if (typeof fields['occurredAt'] !== 'string' || !isValidTimestamp(fields['occurredAt'])) fail('occurredAt', 'invalid_value');
  if (fields['schemaVersion'] !== EVENT_ENVELOPE_SCHEMA_VERSION) fail('schemaVersion', 'unsupported_version');
  if (fields['payload'] === null || typeof fields['payload'] !== 'object' || Array.isArray(fields['payload'])) fail('payload', 'invalid_type');
  validatePayload(fields['payload']);
  for (const field of ['correlationId', 'causationId']) {
    if (Object.hasOwn(fields, field) && (typeof fields[field] !== 'string' || !fields[field].trim())) fail(field, 'invalid_value');
  }
  return value as EventEnvelopeV1;
}

/** Serialize a fully validated V1 envelope without dropping payload values. */
export function serializeEventEnvelope(value: unknown): string {
  return JSON.stringify(validateEventEnvelope(value));
}

/** Parse and validate an existing event without assigning a new identity. */
export function deserializeEventEnvelope(json: string): EventEnvelopeV1 {
  if (typeof json !== 'string') fail('json', 'invalid_type');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    fail('json', 'malformed_json');
  }
  return validateEventEnvelope(value);
}

/** Create a new event occurrence with its own UUID v4 identity. */
export function createEventEnvelope(input: CreateEventEnvelopeInput): EventEnvelopeV1 {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) fail('input', 'invalid_type');
  for (const field of Object.keys(input)) {
    if (!creationFields.has(field)) fail('input', 'unknown_field');
  }
  return validateEventEnvelope({
    eventId: `${input.sourceDomain}-${globalThis.crypto.randomUUID()}`,
    eventType: input.eventType,
    sourceDomain: input.sourceDomain,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload,
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId }),
  });
}
