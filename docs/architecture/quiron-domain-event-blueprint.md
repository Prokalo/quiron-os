# Quirón — Domain & Event Blueprint (from "Quirón Digital Operating System" board)

Source: Elias's Miro-style board PDF ("Quirón — System Blueprint v1-2"), extracted 2026-09-16. This is a more detailed, formalized version of the Core/Spine concept introduced in `messaging-module-design.md` — same philosophy, now spelled out per-domain with explicit ownership, event contracts, and boundary rules. Treat this as the current authoritative domain model; `messaging-module-design.md` remains the messaging-module implementation plan built on top of it.

## Top-level structure

- **Líneas de Negocio:** Seguros (Quirón Seguros) · AF/BP (Arquitectos Financieros / Blindaje Patrimonial) · Ambos (shared)
- **Dominios de Negocio (6):** Marketing y Leads, Ventas, Pólizas, Siniestros, Renovaciones, Pagos
- **Servicios Compartidos (3 panels):** Clientes/Cliente 360, Tareas/Agendas, Documentos
- **Core / Spine:** coordinates the system, owns no domain-specific business data.

**Core business rule:** `Si ClientClassification = BP → BusinessLine = AF`. BP/VIP clients are normally not sold insurance through Quirón Seguros directly; historical policy records can still exist and remain visible without changing current classification.

## Core / Spine (4 things it owns)

1. **Registro de Identidad** — `ClientID`, `PolizaID`, `SiniestroID`. Each generated once, globally unique, never reused, never derived from PII (name/email/policy number); external-system IDs stored separately.
2. **Relaciones** — `ClientID ↔ PolizaID` (1-to-many), `PolizaID ↔ SiniestroID` (1-to-many), `ClientID ↔ SiniestroID` (derived via policy, not duplicated). Rules: canonical IDs only, store only direct/authoritative relations, references not domain data, domains stay owners of the real records.
3. **Event Backbone / Live Board** (airport-board analogy) — every event has a Producer (domain that emitted it) and Consumers (domains that react). Domains publish; domains never talk to each other directly; events describe what happened, not what another module should do; the Live Board coordinates communication but runs no business logic; events reference canonical IDs only.
4. **Entity Registry / Estado Compartido** — tiny shared record per entity: `EntityID`, `EntityType`, related canonical IDs, lifecycle state (Activo/Inactivo/Cerrado/Archivado), `ResponsibleUser`/`ResponsibleTeam`, `SourceDomain`, `CreatedAt`/`UpdatedAt`. Explicitly excludes: premium, coverage, deductible, insurer-specific conditions, claim notes, payment history, renewal logic, sales notes — those stay inside their owning domain. Rule of thumb: if a value must be reflected immediately across multiple domains, it belongs in shared state; if only one domain needs it to operate, it stays local.

## The 6 domains (Propósito → Owns → Publishes → Consumes)

**Pólizas** (Seguros only) — owns the full policy record per ramo (Vida, Auto, GMM, Daños; individual + grupal). Publishes `PolicyCreated/Updated/Activated/Cancelled/Expired/DocumentAdded`. Consumes `ClientCreated/Updated`, `DocumentAdded`, `PaymentReceived`, `ClaimOpened`. Owns coverage, deductible, premium/payment schedule outright — renewal workflow, payment transactions, and claim handling are explicitly *not* its property even though related.

**Siniestros** (Seguros only) — owns the claim lifecycle (report #, incident date/type, status, adjuster info, evidence, resolution). Publishes `ClaimOpened/Updated/StatusChanged/DocumentAdded/Resolved/Closed`. Consumes `PolicyCreated/Updated/Cancelled`, `ClientUpdated`, `DocumentAdded`, `TaskCompleted`.

**Renovaciones** (Seguros only) — owns the renewal case: window, deadlines, quote comparisons, client decision, outcome. Publishes `RenewalWindowOpened/Started/QuoteReceived/ClientContacted/DecisionPending/Accepted/Declined/Completed/Closed`. Reads policy expiration/carrier/product/premium/coverage from Pólizas (read-only) and consumes `PolicyCreated/Updated/Cancelled/Expired`, `PaymentReceived`, `ClientUpdated`, `TaskCompleted`, `DocumentAdded`.

**Pagos** (Seguros only) — owns payment schedule, amounts due/paid, status, method, proof, balance, delinquency notes. Publishes `PaymentDue/Received/Overdue/Failed/Completed`. Reads premium/status/terms/carrier from Pólizas; consumes `PolicyCreated/Updated/Activated/Cancelled`, `ClientUpdated`, `TaskCompleted`.

**Ventas** (Ambos — Seguros + AF/BP, process can vary by line) — owns the active sales opportunity: funnel stage, owner, products offered, quote refs, estimated value, follow-up history, objections, close date/outcome. Publishes `OpportunityCreated/Updated/Won/Lost`, `SaleClosed`, `ProposalSent`. Consumes `LeadQualified`, `ClientCreated/Updated`, `TaskCompleted`, `DocumentAdded`.

**Marketing y Leads** (Ambos) — owns the lead/prospect record pre-Client: source/campaign/channel, qualification status, product interest, routing/disqualification reason, conversion status. Publishes `LeadCreated/Updated/Qualified/Disqualified/Routed/Converted`. Consumes `ClientCreated/Updated`, `OpportunityCreated/Won/Lost`. Explicit flow: **Visitante → Lead → Calificado → Cliente creado/asociado → Oportunidad de venta**; a new lead is matched against existing `ClientID` before creating a duplicate.

## The 3 shared services

**Clientes / Cliente 360** (Ambos) — the unified client view: profile, contact info, comm preferences, classification (Estándar vs BP/VIP → determines Seguros vs AF line), insurance segments held (Autos/GMM/Vida). Publishes `ClientCreated/Updated/ClientClassificationChanged/ClientStatusChanged`. Consumes `PolicyCreated`, `ClaimOpened`, `PaymentReceived`, `RenewalWindowOpened`, `DocumentAdded`. This is the natural home for the "everything in one place" cross-line view.

**Tareas/Agendas** (Ambos, shared by all domains) — centralizes actionable work: title, assignee, team/domain, due date/time, priority, status, related Client/Policy/Claim IDs, triggering domain, follow-up/completion notes. Publishes `TaskCreated/Assigned/Due/Completed/Overdue/Cancelled`. Consumes events from every other domain (`LeadQualified`, `RenewalWindowOpened`, `PaymentOverdue`, `ClaimOpened/StatusChanged`, `DocumentRequested`, `PolicyExpirationApproaching`). Rule: Tareas/Agenda must never decide business logic — Tareas = what needs doing, Agenda = when it's scheduled.

**Documentos** (Ambos, shared platform capability) — centralizes file storage/classification, linked to whichever entity owns it (client/policy/claim/task). Publishes `DocumentAdded/Updated/Replaced/Archived`. Consumes `ClientCreated`, `PolicyCreated`, `ClaimOpened`, `RenewalStarted`, `OpportunityWon`.

## Why this matters for "one CRM view across both business lines"

The blueprint's answer to "everything in one place" is **not** a single database table shared by every module — it's Cliente 360 (and a dashboard layer) as a *read projection* over the events every domain already publishes, keyed on canonical `ClientID`/`PolizaID`/`SiniestroID`. Any unified pipeline/targets view (leads → sales → policies → claims → renewals → payments, across Seguros and AF/BP) should be built the same way: subscribe to the event backbone, don't become a 7th domain that owns duplicate data.

## Agentic layer — orchestrator + domain agents (added 2026-09-18)

Direction from Elias: layer an agentic AI system on top of this architecture — one orchestration agent living at the Core/Spine, and one agent per domain (Pólizas, Pagos, Siniestros, etc.), each governed by the orchestrator.

This maps directly onto the event architecture already defined above rather than requiring new infrastructure:

- **Orchestrator agent** sits where the Event Backbone already sits. It has read visibility across all domain events (the same visibility the Live Board already has) and can route, delegate, or escalate — but, like the Live Board itself, it runs no business logic of its own and holds no domain data. Its job is coordination, not deciding things inside a domain.
- **Domain agents** (one per Pólizas, Siniestros, Renovaciones, Pagos, Ventas, Marketing y Leads, and eventually Proyectos BP) each own their domain's actions the same way the domain itself owns its data: an agent's tool access is scoped to its own domain plus read-only access to the Entity Registry, and it publishes/consumes events through the same contract domains already use to talk to each other.
- **Agents don't talk to each other directly** — same rule as domains. A cross-domain action routes through the orchestrator/event bus, never agent-to-agent. Breaking this here would silently reintroduce the tight coupling the whole Core/Spine design exists to avoid.
- **This isn't a new build track — it's already seeded.** The messaging module design's Phase 4 ("AI assistant as a consumer that reads threads + core data with permissions") *is* the first domain agent, scoped to messaging. The practical path to the full multi-agent system: get that one agent working well inside messaging first, then replicate the same pattern (scoped tool access + event subscription, no direct agent-to-agent calls) to the next domain rather than standing up the whole roster at once.