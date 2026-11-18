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

/** Create a new event occurrence with its own UUID v4 identity. */
export function createEventEnvelope(input: CreateEventEnvelopeInput): EventEnvelopeV1 {
  return {
    eventId: `${input.sourceDomain}-${globalThis.crypto.randomUUID()}`,
    eventType: input.eventType,
    sourceDomain: input.sourceDomain,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload,
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
    ...(input.causationId === undefined ? {} : { causationId: input.causationId }),
  };
}
