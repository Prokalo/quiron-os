# Quirón OS — Modular Architecture Build Plan (v2)

This folder splits the master architecture (`Full-QCRM.mmd` v2) into 10 chronological Mermaid trees.
Each tree is understandable on its own and adds to what the previous trees built.

## Changes vs v1

- **BP 3.4 → Seguros 2.6 handoff is event-only.** BP publishes `BPProtectionPlanRequested` (ClientID + ProyectoBPID) on the Event Backbone; Ventas consumes it and opens a Seguros opportunity at 2.6. No direct domain-to-domain call. Client classification (BP → AF) does not change.
- **Return path added.** Pólizas publishes `PolicyActivated`; BP closes 3.4 and Customer Happiness starts.
- **Customer Happiness is one shared service** for both lines (BP's 7 steps). Removed from Seguros Operations (old 3.4) and from BP.
- **Portal del Cliente is one shared service** for both lines. It is a read-model consumer and a channel, not a domain. It adds "Estado de proyecto BP", and "contactar a mi asesor" goes through Messaging.
- **Administración stays separate per line** (Seguros in Tree 7, BP in Tree 10).
- **BP renumbered:** 4 Inteligencia de Mercado, 5 Operaciones BP (por definir), 6 Administración BP.
- **Core owns the classification rule** `ClientClassification = BP → BusinessLine = AF`.

## Build order

1. **Core / Spine** — canonical IDs, relationships, entity state, event backbone, classification rule.
2. **Shared Services** — Cliente 360, Tareas / Agendas, Documentos.
3. **Messaging** — automation rules, conversations, advisor inbox, channel adapters (Portal adapter reserved for Tree 7).
4. **Seguros: Marketing + Leads** — prospecting, segmentation, campaigns, lead generation and measurement.
5. **Seguros: Sales** — lead intake through active client; also the entry point for BP handoff opportunities at 2.6.
6. **Seguros: Operations** — renewals, claims, post-sale (3.1–3.3).
7. **Seguros Administration + Shared Client Services + Intelligence** — Seguros finance/KPIs/reporting; Customer Happiness and Portal del Cliente built once as shared services; Seguros intelligence.
8. **BP: Positioning + Sales** — prospect generation through project close.
9. **BP: Project Delivery** — modules 3.1–3.10, including the 3.4 event handoff into Seguros 2.6.
10. **BP: Intelligence + Operations + Administration** — BP 4–6, and BP plugs into the shared Customer Happiness and Portal.

## Reading rule

Each tree has three visual levels:
- **Existing foundation**: already built in earlier trees.
- **Current module**: what is being added in this phase.
- **Children**: processes / submodules owned by that module.

Only architecturally important cross-module links are drawn. Dotted arrows labeled with an event name go through the Event Backbone; there are no direct domain-to-domain arrows.

## Pending definitions (from the business)

- **Administración BP**: current items (facturación y cobranza, minutas de tiempo cliente, control de horas, pago de aliados, pago de comisiones, pago a embajadores) reflect today's practice. Provisional until the company confirms the final attributes.
- **Operaciones BP**: por definir.
- **Metas**: tentative; not placed in any tree until the company defines how it works.

## Embajadores program

Ambassadors refer people; Quirón sells BP and/or insurance to them; on close, the ambassador is paid a percentage of the total deal.
- **Lead source**: the referral enters Marketing y Leads with source = embajador (Tree 4 / Tree 8).
- **Attribution (build now)**: the lead stores `AmbassadorID`; it carries to the opportunity and the closed deal in both lines, including BP → Seguros handoff opportunities. Deal value is recorded on close.
- **Payout (pending)**: who pays (BP, Seguros, or both) and how is not defined yet. It will be a consumer of `SaleClosed` / `OpportunityWon` events, so it can be added later without changing anything upstream.
- **Relationship**: treating ambassadors well (especially top ones) lives in Customer Happiness step 7 — same service, but the audience is ambassadors, not clients.
