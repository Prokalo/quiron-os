# Spec 003 — Event Envelope

**Status:** Draft  
**Owner:** Elias  
**Dependencies:** None

## 1. Context and Objective
Quirón OS needs a standardized event structure that independent domains can create and interpret without depending on one another's internal implementations. The Event Envelope defines common metadata, a domain-specific payload, validation, and JSON serialization so publishers, the future Event Backbone, and consumers can exchange events under a predictable contract. It does not deliver events or execute workflows.

## 2. Users / Actors
- **Event Publisher (domain/service):** Creates an event using the shared envelope contract.
- **Event Backbone:** Transports valid envelopes to interested subscribers (implemented separately).
- **Event Consumer (domain/service):** Reads and interprets received envelopes; owns any resulting action.

## 3. User Stories
- **US-1 — Publisher:** As a publisher, I want a standard event structure so other domains can interpret my events without depending on my internals.
- **US-2 — Backbone:** As the Event Backbone, I want a consistent envelope so I can identify event metadata for routing.
- **US-3 — Consumer:** As a consumer, I want predictable event metadata and payload access so I can decide whether to react.

## 4. Functional Requirements (EARS)
- **FR-1:** WHEN a new event occurrence is created, THE SYSTEM SHALL assign a globally unique `eventId` formatted as `<sourceDomain>-<UUID>`; reconstructing the same event SHALL preserve its ID.
- **FR-2:** THE SYSTEM SHALL require a non-empty `eventType` identifying what occurred.
- **FR-3:** THE SYSTEM SHALL require a non-empty `sourceDomain` identifying the publisher; its value SHALL match the domain prefix of `eventId`.
- **FR-4:** THE SYSTEM SHALL require `occurredAt` as a valid ISO 8601 timestamp with an explicit timezone offset.
- **FR-5:** THE SYSTEM SHALL require a JSON-compatible `payload` object; an empty object `{}` SHALL be valid.
- **FR-6:** THE SYSTEM SHALL require a positive integer `schemaVersion` identifying the version of the entire envelope contract, not the domain-specific payload schema; V1 SHALL use `1`.
- **FR-7:** THE SYSTEM SHALL support optional `correlationId` and `causationId` identifiers; their absence SHALL NOT invalidate an envelope.
- **FR-8:** WHEN an envelope is created or read from JSON, THE SYSTEM SHALL validate all required fields, field types, formats, and the supported envelope version.
- **FR-9:** IF input is malformed, invalid, or uses an unsupported envelope version, THEN THE SYSTEM SHALL reject it with an identifiable validation error, without returning a partially valid envelope.
- **FR-10:** THE SYSTEM SHALL serialize valid envelopes to JSON and deserialize supported valid JSON into an equivalent envelope without generating a new event ID.

## 5. Non-Functional Requirements
- **NFR-1 — Interoperability:** The envelope SHALL have one documented JSON contract shared by publishers, the backbone, and consumers.
- **NFR-2 — Independence:** The shared envelope contract SHALL NOT import or depend on any business domain or broker implementation.
- **NFR-3 — Data Integrity:** JSON round trips SHALL preserve every supplied envelope field and its value, including optional metadata and nested payload data.
- **NFR-4 — Security:** Validation errors and diagnostics SHALL NOT include raw payload contents or sensitive field values.
- **NFR-5 — Evolution:** Envelope schema changes SHALL use explicit versioning; unsupported versions SHALL fail clearly rather than being silently reinterpreted.

## 6. Acceptance Scenarios
### AS-1 — Valid Envelope Creation
**Given** a publisher supplies a valid event type, source domain, and JSON-compatible payload  
**When** it creates an event envelope  
**Then** the envelope has a domain-prefixed unique UUID, required metadata, `schemaVersion: 1`, and passes validation.  
**Covers:** FR-1–FR-6, FR-8

### AS-2 — JSON Round-Trip Integrity
**Given** a valid envelope with nested payload data and optional tracing IDs  
**When** it is serialized and deserialized  
**Then** all supplied values, including `eventId`, remain unchanged.  
**Covers:** FR-10, NFR-1, NFR-3, EC-7

### AS-3 — Invalid Input Rejection
**Given** missing fields, malformed JSON, an invalid timestamp, a mismatched ID prefix, or an unsupported version  
**When** the input is parsed or validated  
**Then** it fails with an identifiable error and no partially valid envelope.  
**Covers:** FR-8, FR-9, EC-1–EC-3, EC-6

### AS-4 — Safe Validation Errors
**Given** invalid input whose payload contains sensitive values  
**When** validation fails  
**Then** the reported error identifies the defect without exposing those values.  
**Covers:** NFR-4

### AS-5 — Concurrent Creation
**Given** two publishers create new event occurrences simultaneously  
**When** both envelopes are created  
**Then** each has a different valid `eventId`, even if timestamps match.  
**Covers:** FR-1, EC-4

### AS-6 — Optional Metadata and Empty Payload
**Given** a valid event with `payload: {}` and no tracing IDs  
**When** the envelope is created and validated  
**Then** it is accepted, and omitted optional fields remain omitted after a JSON round trip.  
**Covers:** FR-5, FR-7, FR-10

## 7. Edge Cases
- **EC-1 — Missing Fields:** Missing or null required fields are rejected; omitted optional tracing IDs are accepted.
- **EC-2 — Malformed JSON:** Invalid JSON syntax is rejected before an envelope is constructed.
- **EC-3 — Invalid Values:** Empty identifiers, mismatched domain prefix, invalid UUID/timestamp, wrong types, and unsupported versions are rejected.
- **EC-4 — Concurrency:** Simultaneously created event occurrences receive distinct IDs.
- **EC-5 — Unsupported Payload:** Non-JSON-compatible values fail serialization explicitly rather than being silently dropped.
- **EC-6 — Failed Deserialization:** Invalid JSON or invalid envelope content never yields a partial envelope.
- **EC-7 — Existing Event:** Reading, serializing, or reusing the same event preserves its ID; a new occurrence gets a new ID.

## 8. Out of Scope
- Event publication, routing, delivery, subscriptions, or message broker configuration.
- Delivery retries, acknowledgments, deduplication, or delivery guarantees.
- Execution of consumer workflows or tasks.
- Event persistence, historical replay, or audit storage.
- Domain-specific payload schemas and business-rule validation.
- Advanced tracing metadata beyond the two optional IDs.

## 9. Definition of Done
- [ ] All six mandatory fields and two optional tracing fields follow the approved contract.
- [ ] New event IDs are globally unique and domain-prefixed; existing IDs survive reconstruction.
- [ ] Required fields, version, IDs, timestamps, and JSON-compatible payloads are validated.
- [ ] Missing optional IDs and an empty payload object are supported.
- [ ] JSON serialization/deserialization preserves all supplied data and fails safely for invalid input.
- [ ] All FRs, ASs, applicable ECs, and NFRs are verified by passing automated tests.
- [ ] No business-domain or broker dependencies are introduced.
- [ ] Codex implementation passes Claude Code review and receives Elias's final approval.

## 10. Open Questions
**Unresolved:** None.

**Resolved decisions:** `schemaVersion` covers the whole envelope (V1 = `1`); `eventId` uses `<sourceDomain>-<UUID>`; six fields are mandatory; `correlationId` and `causationId` are optional.

**Deferred:** Future envelope versions may add tracing metadata; any new field requires an explicit contract/version decision.
