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

/** Validate V1 metadata and return the original envelope without changing its identity. */
export function validateEventEnvelope(value: unknown): EventEnvelopeV1 {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail('envelope', 'invalid_type');
  }
  const fields = value as Record<string, unknown>;
  for (const field of requiredFields) {
    if (!Object.hasOwn(fields, field) || fields[field] === null) fail(field, 'required');
  }
  for (const field of Object.keys(fields)) {
    if (!allowedFields.has(field)) fail('envelope', 'unknown_field');
  }
  if (typeof fields['eventType'] !== 'string' || !fields['eventType'].trim()) fail('eventType', 'invalid_value');
  if (typeof fields['sourceDomain'] !== 'string' || !sourceDomainPattern.test(fields['sourceDomain'])) fail('sourceDomain', 'invalid_value');
  if (typeof fields['eventId'] !== 'string' || !fields['eventId'].startsWith(fields['sourceDomain'] + '-') ||
      !uuidV4Pattern.test(fields['eventId'].slice(fields['sourceDomain'].length + 1))) fail('eventId', 'invalid_value');
  if (typeof fields['occurredAt'] !== 'string' || !isValidTimestamp(fields['occurredAt'])) fail('occurredAt', 'invalid_value');
  if (fields['schemaVersion'] !== EVENT_ENVELOPE_SCHEMA_VERSION) fail('schemaVersion', 'unsupported_version');
  if (fields['payload'] === null || typeof fields['payload'] !== 'object' || Array.isArray(fields['payload'])) fail('payload', 'invalid_type');
  for (const field of ['correlationId', 'causationId']) {
    if (Object.hasOwn(fields, field) && (typeof fields[field] !== 'string' || !fields[field])) fail(field, 'invalid_value');
  }
  return value as EventEnvelopeV1;
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
