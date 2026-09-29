# Prototype → Architecture Mapping

How the clickable prototype (`index.html`, "Plataforma Quirón") maps onto the domain/event architecture in `quiron-domain-event-blueprint.md`. Written 2026-09-17 while scoping a unified-CRM problem for Quirón — kept here so the mapping doesn't have to be re-derived later.

## Screen-by-screen

| Prototype screen | Backing domain(s) | Notes |
|---|---|---|
| **Inicio** | cross-domain read-model | "Actividad reciente" and "Pendientes de hoy" are a feed over recent events from every domain — not owned data, a live projection. |
| **Dashboard Dirección** | cross-domain read-model over Pólizas, Pagos, Siniestros, Ventas, BP | Executive rollup across both business lines — the clearest UI expression of "everything in one place." Should be built as a projection, not a 7th domain (see the domain-event doc's closing section). |
| **Clientes** (list) | Clientes/Cliente 360 shared service | Unified client list spanning both lines. |
| **Cliente 360** | Clientes/Cliente 360 (shell) + tab-level domains | Tabs map directly: Resumen = cross-domain rollup; Pólizas = Pólizas domain; Siniestros = Siniestros domain; Documentos = Documentos domain; Actividad = cross-domain event timeline. **Patrimonio tab = gap**, see below. |
| **Pipeline de ventas** (kanban) | Marketing y Leads + Ventas | Columns Nuevo/Contactado/Calificado are the robot-driven Marketing y Leads stages (`LeadCreated→LeadQualified`); Cita/Propuesta/Cierre/Ganado are Ventas stages (`OpportunityCreated→Won`). The "Cita" column is the robot→human handoff point. |
| **Siniestros** | Siniestros domain | Direct 1:1. |
| **Cobranza & Comisiones** | Pagos domain + a derived commission calculation | Pagos owns the payment ledger; commission projection (tabulador by policy-year) is a calculation on top, not explicitly assigned to a domain in the blueprint — worth clarifying who owns the commission schedule/rate table. |
| **Renovaciones** | Renovaciones domain | Direct 1:1. |
| **Proyectos BP** / **Fideicomisos** | Provisional **Proyectos BP** domain (scaffolded 2026-09-18, full field definition still open) | The blueprint's original 6 domains + 3 shared services only covered the Seguros side and the two cross-line services (Marketing/Ventas). A minimal BP domain shape is now scaffolded (see Decisions below) so Core/Spine integration isn't blocked on the business finishing its definition of what belongs inside BP — but the actual fields, workflow rules, and stage-specific logic are still pending business confirmation. |
| **Portal del cliente** | read-only consumer of Pólizas, Siniestros, Documentos | Same pattern as messaging-module-design.md's Phase 5 ("client-portal messaging as just another channel adapter") — the portal is a consumer/channel, not a new domain. |
| **Marketing & Leads** | Marketing y Leads domain | Direct 1:1 — campaign performance (leads, CPL, conversion) is Marketing y Leads' own owned data. |
| **Reportes** | cross-domain read-model (prima emitida, retención) + **Metas domain** (see Decisions below) | Decided 2026-09-18: replace the "Producción por asesor" per-advisor table with a single company-level target bar per business line. See Decisions section for the full reasoning. |
| **Ajustes** | not a business domain | Connector config (WhatsApp Business, Google Drive, AI assistant, aseguradora APIs) — this is the messaging-module's adapter layer plus Core shared-services config, not domain data. Target-setting (see Decisions) also lives here, near Usuarios & roles, gated to Admin. |
| **AI panel** (Asistente Quirón) | consumer, with permissions, of all domains | Matches messaging-module-design.md Phase 4 ("AI assistant as a consumer that reads threads + core data with permissions"). Now generalized: see the domain-event doc's "Agentic layer" section — this AI panel is the first instance of the orchestrator/domain-agent pattern, not a one-off. |

## Decisions

### Metas (Targets) — decided 2026-09-18

**The gap:** no domain in the blueprint owns the sales/production target itself. Ventas owns opportunities and outcomes (what happened); a target is a goalpost set in advance (what should happen) — different kind of data, needs its own small domain rather than being bolted onto Ventas or Pólizas.

**Resolution:**
- New small **Metas** domain. Owns: business line (Seguros/BP), scope, metric (count vs. $ value), period, target value, set-by, effective dates. Publishes `TargetSet`/`TargetUpdated`. Consumed by Reportes and Dashboard Dirección to compute attainment against real events (PolicyCreated, OpportunityWon, etc.).
- **Scope, for now: company-level only, not per-advisor.** Seguros target is quarterly (~10 new businesses/quarter, company-wide). BP target is annual (~4-6 deals/year, company-wide, given how few people and how low the volume is). No individual quotas are being pinned on advisors at this stage.
- **UI consequence:** the prototype's "Producción por asesor" table (with its per-advisor Meta% column) is removed from Reportes for now. Replaced with a single company-level target bar per business line, read from the Metas domain. Per-advisor production isn't lost at the data layer — every Pólizas/Ventas event already records a `ResponsibleUser` (per the Core's Entity Registry pattern in the domain-event doc) — it's just not surfaced as an individual leaderboard right now.
- **Forward-compatible by design, not by extra work now:** when headcount grows enough for "friendly competition" to make sense, a per-advisor leaderboard is a new Reportes view reading data that's already being captured (ResponsibleUser on every record) plus optionally new `scope: per-advisor` rows in the same Metas schema. It does not require a backend rework — the schema already allows scope values beyond "company," they're just unused for now.
- **Management:** target-setting is an Admin-only action, placed in Ajustes near "Usuarios & roles" (where Admin/Operador roles are already modeled) — not in Reportes, which stays read-only. Setting a target is a forward-looking config action; Reportes is a look-back report. Keeping them apart avoids turning a reporting screen into an editing workflow.

### Proyectos BP / Fideicomisos — provisional scaffold, decided 2026-09-18

Elias doesn't want backend work on BP blocked on the business fully confirming what belongs inside it. Resolution: define BP's envelope now — canonical ID + event contract + provisional stage list — while leaving field-level detail loose until confirmed. Same escape-hatch pattern already used for Metas (schema allows more than what's used today, without a rework later).

- **Canonical ID:** `ProyectoBPID`, generated the same way as the other three (globally unique, PII-free), linked to `ClientID` (one client → many BP projects, mirroring the Client↔Poliza relation).
- **Provisional stage enum**, taken from the prototype's own columns so it isn't invented from scratch: NBA → Diagnóstico → Due diligence → Valuación → Planes. Treat this as versioned/extendable — expect the business to add, rename, or reorder stages.
- **Generic event set**, deliberately underspecified so it doesn't need to change when business detail arrives: `BPProjectCreated`, `BPStageChanged`, `BPDocumentAdded` (delegates to Documentos the same way other domains do), `BPClosed`. No fine-grained per-stage events yet — add those once the business defines what actually happens inside each stage.
- **Flexible metadata field** on the project record (a schemaless JSON blob) to hold whatever stage-specific data shows up before it's worth a real column — same escape hatch used elsewhere when a shape isn't settled.
- **Fideicomisos:** treated as a related entity under the same project (`FideicomisoID`, optional, linked to `ProyectoBPID`) rather than its own domain, until the business says otherwise.
- **What this unblocks:** Core/Spine integration — ID issuance, event publishing, Cliente 360/Dashboard Dirección projections, Tareas/Agenda hooks — can all be wired up against this shape today.
- **What stays blocked:** the actual UI fields, workflow rules, and stage-specific business logic. Those still need the business's answer, and the enum/events above should be expected to change once they land.

## Takeaways

1. The prototype is the UI target for the architecture in `quiron-domain-event-blueprint.md` — building the backend is implementing what's already wireframed, not designing new screens.
2. Two concrete gaps identified: **(a)** BP's own operational domain (Proyectos BP / Fideicomisos) now has a provisional scaffold (2026-09-18) so backend work can start, but full field/workflow definition is still open pending the business; **(b)** sales/production targets (Metas) — resolved, see Decisions above (new Metas domain, company-level scope for now).
3. "Everything in one place" (Inicio, Dashboard Dirección, Reportes, Cliente 360) should stay read-models/projections over the event backbone — never a new authoritative data store — consistent with the Core's own rule that it owns no domain-specific business data.
4. The agentic AI layer (orchestrator + one agent per domain, see the domain-event doc's "Agentic layer" section) is designed to ride on top of this same event contract — no separate infrastructure needed, and the messaging module's Phase 4 AI assistant is its first working instance.