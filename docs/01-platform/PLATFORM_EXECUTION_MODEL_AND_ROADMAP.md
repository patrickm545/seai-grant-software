# Platform Execution Model and Roadmap

| Field | Value |
| --- | --- |
| Document ID | PLAT-EXEC-ROADMAP-001 |
| Status | Active |
| Owner | Clada Systems Product and Architecture |
| Review cycle | Every platform release |
| Last reviewed | 2026-07-09 |

## Purpose

This document defines the execution model for moving Clada OS from documented architecture into a working platform that SolarGRANT Pro can consume.

It turns the platform architecture and capability model into a practical build sequence, release roadmap, prioritisation method, dependency model, maturity scale, risk register, and decision-gate process.

## Scope

This is a planning and sequencing document.

It applies to Platform Release 1.x planning, feature specification, ADR selection, platform implementation milestones, and SolarGRANT Pro integration planning.

It does not implement application code, change product behaviour, introduce database migrations, create authentication flows, alter UI, or start any platform service implementation.

## Why

Clada OS now has an approved architecture and capability model. The next risk is not a lack of ambition; it is building platform capabilities in the wrong order.

Platform implementation must happen in a sequence that respects dependency direction, customer value, auditability, privacy, security, module consumption, and SolarGRANT Pro delivery needs. Without an execution model, the team could overbuild speculative abstractions, delay SolarGRANT Pro, create product-specific platform code, or implement high-risk capabilities such as AI before identity, permissions, audit, and human review are ready.

## What

The execution model has five parts:

1. A minimum viable Clada OS platform definition.
2. A capability maturity model for tracking each platform capability from idea to reusable production capability.
3. A capability prioritisation framework for deciding what to build next.
4. A dependency-led build order and release roadmap for Platform Release 1.x.
5. Decision gates, risk controls, and SolarGRANT Pro consumption guidance.

## How

Use this document before beginning each Platform Release 1.x milestone.

The operating sequence is:

1. Confirm the release objective and non-goals.
2. Check the dependency graph before changing build order.
3. Score candidate capabilities with the prioritisation framework.
4. Confirm each capability's current maturity level and target maturity level.
5. Define the smallest SolarGRANT Pro proving slice that will consume the capability in production or production-like use.
6. Create or update feature specifications and ADRs before implementation.
7. Validate cross-cutting concerns including security, privacy, auditability, human review, AI governance, reliability, and observability.
8. Update COM navigation and sprint records at release close.
9. Do not move to the next release until the decision gates are satisfied.

## Platform MVP Definition

The minimum viable Clada OS platform is the smallest set of reusable capabilities that lets SolarGRANT Pro consume the platform through documented interfaces instead of owning generic identity, access, workflow, document, notification, AI governance, reporting, and configuration behaviour itself.

The MVP is not the whole platform. It is the platform foundation required for a real SolarGRANT Pro MVP integration.

### MVP Capabilities

| Capability | MVP outcome | Minimum maturity target before SolarGRANT Pro consumes it |
| --- | --- | --- |
| Identity and organisation foundation | Clada OS can represent organisations, account ownership, tenant boundaries, and actor identity. | L4 Production Ready |
| Users and roles | Internal users, installer users, and service users can be represented with clear role assignment. | L4 Production Ready |
| Permissions | Access to customer, workflow, document, AI, reporting, and configuration actions is controlled through documented permissions. | L4 Production Ready |
| Audit and activity ownership | Material actions have actor, organisation, timestamp, subject, and reason context. | L4 Production Ready |
| Customer and contact foundation | SolarGRANT Pro can use reusable customer/contact records without redefining platform identity or communication history. | L3 Implemented before integration; L4 before production launch |
| Workflow foundation | SolarGRANT Pro can track lead, readiness, review, and completion state through platform workflow contracts. | L4 Production Ready |
| Document foundation | Homeowner uploads, document metadata, review state, and application-pack preparation can use platform document contracts. | L4 Production Ready |
| Notifications foundation | Follow-up, reminder, and operational notification events can be requested through a platform communication boundary. | L3 Implemented before integration; L4 before production launch |
| Module configuration | SolarGRANT Pro can configure module-specific statuses, labels, checklists, and thresholds without changing platform internals. | L3 Implemented before integration; L4 before production launch |
| AI assistance governance | AI outputs are traceable, reviewable, permission-aware, and bounded by human approval before consequential use. | L4 Production Ready |
| Reporting foundation | Installer pipeline visibility and operational metrics are generated from platform workflow, audit, and document events. | L3 Implemented before integration; L4 before production launch |

### Post-MVP Capabilities

These capabilities are important but should follow SolarGRANT Pro platform consumption or be introduced only where a release has a direct dependency:

| Capability | Why it follows MVP |
| --- | --- |
| Integrations framework | Provider boundaries need stable identity, permissions, audit, workflow, notification, document, and AI contracts first. |
| Billing and commercial operations | Commercial automation depends on validated packages, account ownership, usage signals, and reporting. |
| Customer portal foundation | Portal work should consume stable identity, workflow, documents, notifications, and permissions instead of defining them. |
| Contractor dashboard foundation | Dashboard patterns should be informed by SolarGRANT Pro operational usage before being generalized. |
| Advanced reporting and analytics | Reporting should start with operational metrics before moving into forecasting, benchmarking, or cross-product analytics. |

### Deferred Capabilities

These capabilities should not be built during the MVP path unless Clada Systems leadership explicitly changes the release objective:

| Capability | Deferral reason |
| --- | --- |
| Marketplace or partner extensibility | Requires stable platform APIs, billing, permissions, support model, and evidence from more than one product or partner workflow. |
| Public developer SDK | Premature before platform contracts have survived internal product consumption. |
| Low-code workflow builder | Higher abstraction should follow evidence from repeated workflow configuration needs. |
| Multi-product self-service provisioning | Not required for SolarGRANT Pro MVP integration and high risk if tenant boundaries are not mature. |
| Autonomous AI decisioning | Conflicts with current human-review expectations for customer, compliance, finance, legal, and grant-related outcomes. |
| Full enterprise SSO suite | Can be considered later, after core identity and organisation foundations are production ready. |

## Capability Maturity Model

Clada OS tracks capability maturity separately from release status. A release may move one capability several levels or move several capabilities one level.

| Level | Name | Meaning |
| --- | --- | --- |
| L0 | Idea | Capability exists only as a concept. |
| L1 | Documented | Capability is described in the COM. |
| L2 | Specified | Capability has technical and product specifications. |
| L3 | Implemented | Capability exists in code. |
| L4 | Production Ready | Capability is tested, reviewed, and usable in production. |
| L5 | Reusable Across Products | Capability has been successfully consumed by at least two genuinely separate product modules, or an approved CTO Architecture Decision Record explicitly documents why equivalent evidence exists. |

L4 represents production readiness. L5 represents proven reuse.

### Movement Between Levels

| Movement | Required evidence |
| --- | --- |
| L0 to L1 | COM document or capability map entry with owner, purpose, scope, and boundaries. |
| L1 to L2 | Feature specification, API or contract proposal, dependency review, risk review, and ADR where material. |
| L2 to L3 | Implementation matching the approved specification, with documentation updated for any approved differences. |
| L3 to L4 | Tests, review, security/privacy/audit checks, operational readiness, migration notes if relevant, and release approval. |
| L4 to L5 | Successful consumption by at least two genuinely separate product modules, or an approved CTO Architecture Decision Record documenting equivalent evidence. |

Capabilities may move backwards when production evidence shows the API is unstable, the ownership boundary is wrong, the implementation is too product-specific, or risk controls are incomplete.

## Capability Prioritisation Framework

Capability priority is determined by dependency order first and scoring second. A high-scoring capability must still wait if a lower-level dependency is not ready.

### Scoring Model

Score each criterion from 1 to 5, where 1 is low and 5 is high. Multiply by the weight and sum the result.

| Criterion | Weight | Scoring guidance |
| --- | --- | --- |
| Technical dependency | 3 | Higher when many future capabilities require this foundation. |
| Product dependency | 3 | Higher when SolarGRANT Pro cannot progress without it. |
| Compliance and security importance | 3 | Higher when privacy, access, audit, or legal risk is material. |
| Customer impact | 2 | Higher when the capability improves real customer or installer workflows. |
| Reuse potential | 2 | Higher when more than one module is expected to need the capability. |
| Implementation risk | 2 | Higher when early work reduces later architectural or delivery risk. |
| Time to value | 1 | Higher when a small release creates useful validated learning quickly. |
| Strategic importance | 1 | Higher when the capability strengthens the Clada OS platform direction. |

Maximum score is 85.

Use the score bands as guidance:

| Score | Priority interpretation |
| --- | --- |
| 65 to 85 | Foundation priority. Schedule early unless blocked by dependencies. |
| 45 to 64 | Important platform work. Schedule after foundation dependencies are ready. |
| 25 to 44 | Useful but not urgent. Keep in backlog until validated by release needs. |
| 0 to 24 | Defer unless leadership explicitly changes strategy. |

### Prioritisation Rules

1. Identity, organisation, permissions, and audit can override scoring because they protect every later capability.
2. Capabilities that create customer-visible or compliance-relevant outputs must not outrun human-review and audit foundations.
3. SolarGRANT Pro delivery can move a platform capability earlier only when the capability remains product-neutral.
4. Post-MVP capabilities require evidence from MVP usage or explicit business approval.
5. Any capability scoring above 65 still requires a feature specification before implementation.

## Platform Build Order

The recommended Platform Release 1.x build order is dependency-led. Later releases may split or combine items, but they should not invert foundational dependencies without an ADR.

| Order | Capability | Why it comes here | Dependencies | SolarGRANT Pro gain | Do not build yet |
| --- | --- | --- | --- | --- | --- |
| 1 | Identity and Organisation Foundation | Organisation and actor identity are the base for ownership, access, audit, configuration, and commercial relationships. | COM architecture; data model and security ADRs where needed. | Installer accounts, internal Clada users, organisation ownership, and clean separation between customer data contexts. | Enterprise SSO suite, self-service tenant marketplace, complex hierarchy management. |
| 2 | Users, Roles, and Permissions | Users need safe role and permission boundaries before platform data becomes shared across workflows. | Identity and organisation foundation. | Clear installer, internal operator, admin, and service access patterns. | General permission builder, unsupported custom role scripting, broad ABAC engine. |
| 3 | Audit and Activity Foundation | Workflow, document, communication, AI, and reporting features need traceable activity from the start. | Identity, organisations, users, roles, permissions. | Evidence of who changed lead state, reviewed documents, triggered messages, or approved AI-assisted outputs. | Full event-sourcing platform, SIEM replacement, analytics warehouse. |
| 4 | Workflow Foundation | Operational state is the core reusable pattern SolarGRANT Pro needs after access and audit foundations exist. | Identity, permissions, audit, module/product boundary specs. | Lead stage tracking, grant readiness flow, review queues, and operational handoffs. | Visual workflow builder, arbitrary automation engine, cross-product workflow marketplace. |
| 5 | Document Foundation | Document collection and review depend on actors, permissions, audit, and workflow states. | Identity, permissions, audit, workflow, storage/security decisions. | Homeowner uploads, grant document status, reviewed application-pack preparation. | Autonomous document approval, broad OCR platform, public document API. |
| 6 | Notifications and Communications Foundation | Reminders and follow-up should attach to workflow/document events and be auditable. | Identity, permissions, audit, workflow, customer/contact foundation, provider boundary decision. | Lead follow-up, homeowner reminders, internal task prompts, communication history. | Marketing automation suite, bulk campaign platform, provider marketplace. |
| 7 | Module Configuration | Product-specific variation needs a safe platform configuration boundary before AI and reporting encode assumptions. | Identity, permissions, audit, workflow, documents, notifications. | SolarGRANT Pro can configure statuses, labels, document checklists, thresholds, and module rules without forking platform code. | General low-code builder, customer-authored automations, unreviewed runtime scripting. |
| 8 | AI Assistance Governance | AI should be governed after identity, permissions, audit, workflow, documents, notifications, and module configuration can constrain it. | Audit, permissions, workflow, documents, module configuration, AI engineering rules. | Draft summaries, readiness assistance, document review support, and reviewed operator assistance. | Autonomous grant decisions, unreviewed customer-facing AI, provider abstraction marketplace. |
| 9 | Reporting and Operational Metrics | Useful reporting depends on reliable workflow, audit, document, notification, and AI events. | Audit, workflow, documents, notifications, module configuration, AI governance. | Installer pipeline visibility, conversion and readiness metrics, operational bottleneck insight. | BI warehouse, financial forecasting, cross-product benchmarking. |
| 10 | Integrations Framework | Integration consistency becomes valuable once core platform APIs are stable. | Stable platform contracts, permissions, audit, observability expectations. | Cleaner email, SMS, AI provider, CRM, and future portal boundaries. | Public integration marketplace, partner certification programme. |
| 11 | Billing and Commercial Operations | Billing needs stable organisations, account ownership, usage events, packages, and reporting. | Identity, organisations, audit, reporting, commercial model approval. | Pilot/customer account tracking, package readiness, future subscription support. | Automated billing before pricing validation, complex entitlements engine. |
| 12 | Marketplace or Partner Extensibility | External extensibility should wait until internal platform reuse is proven and supportable. | Stable APIs, permissions, audit, billing, integrations, support model, multi-product evidence. | Future partner channels and external modules, not required for SolarGRANT Pro MVP. | SDK, public marketplace, third-party app approval workflow. |

## Dependency Graph

The core dependency chain is:

```text
Identity
  -> Organisation
    -> Users
      -> Roles
        -> Permissions
          -> Audit and Activity Ownership
            -> Customer and Contact Foundation
              -> Lead Intake
                -> Workflow
                  -> Documents
                    -> Notifications
                      -> AI Assistance Governance
                        -> Reporting
```

Module configuration depends on the contracts it configures:

```text
Identity + Permissions + Audit
  -> Workflow + Documents + Notifications
    -> Module Configuration
      -> AI Assistance Governance
      -> Reporting
```

Integrations support platform capabilities only after platform contracts exist:

```text
Platform APIs
  -> Integration Interfaces
    -> Provider Adapters
      -> Notifications, Documents, AI, Reporting, Billing
```

The prohibited dependency remains:

```text
Platform Capabilities
  -/-> SolarGRANT Pro implementation details
```

SolarGRANT Pro may consume platform APIs, configure platform capabilities, and own SEAI-specific rules. Platform capabilities must not import SolarGRANT Pro implementation details or grant-specific language as generic platform concepts.

## SolarGRANT Pro Consumption Map

| Platform capability | SolarGRANT Pro use case | Consumption boundary |
| --- | --- | --- |
| Identity | Installer accounts, internal Clada operators, service actors. | Platform owns actor identity; module owns installer-facing wording. |
| Organisation | Installer company records, Clada internal organisation context, customer account ownership. | Platform owns organisation model; commercial segmentation can evolve later. |
| Users and roles | Admin, installer user, operator, reviewer, service role. | Platform owns reusable role assignment; module owns role labels only where domain-specific. |
| Permissions | Control who can view leads, upload documents, review packs, trigger messages, and view reports. | Platform owns permission checks; module requests capabilities through APIs. |
| Audit and activity | Trace lead changes, document reviews, AI assistance, notification sends, and approvals. | Platform owns event structure; module supplies domain context. |
| Customer and contact foundation | Homeowner/customer records tied to leads, documents, and communications. | Platform owns reusable customer/contact record; module owns grant-specific fields. |
| Lead intake | Capture and structure enquiries before they enter workflow. | Platform owns reusable intake mechanics; module owns SEAI-specific qualification questions. |
| Workflow | Lead stage tracking, grant readiness, review state, installer handoff. | Platform owns workflow mechanics; module configures statuses and domain labels. |
| Documents | Homeowner uploads, document checklist state, review notes, application-pack preparation. | Platform owns document mechanics and review state; module owns required SEAI document list. |
| Notifications | Lead follow-up, missing-document reminders, operator alerts, homeowner nudges. | Platform owns communication request and history; module owns message purpose and approved copy. |
| Module configuration | SolarGRANT Pro statuses, checklist items, labels, thresholds, and product toggles. | Platform owns configuration contract; module owns values within approved boundaries. |
| AI assistance governance | Draft summaries, document assistance, readiness explanation, operator support. | Platform owns AI traceability, review, permissions, and provider boundary; module owns grant-specific instructions. |
| Reporting | Installer pipeline visibility, readiness bottlenecks, follow-up performance, document completion metrics. | Platform owns metric foundations; module owns solar-specific interpretation. |
| Integrations | Email/SMS provider use, future CRM import/export, AI provider adapter. | Platform owns integration interfaces; providers stay behind adapters. |
| Billing and commercial operations | Future installer packages, account status, usage signals. | Deferred until package and pricing assumptions are validated. |
| Marketplace or partner extensibility | Future partner workflows or modules. | Deferred beyond SolarGRANT Pro MVP integration. |

## Release Roadmap

This roadmap adds an explicit module configuration release because configuration is required before governed AI and reporting can safely serve SolarGRANT Pro without encoding solar-specific behaviour into Clada OS.

Each Platform Release 1.x must include a small SolarGRANT Pro proving slice. Product Release 2.0 should consolidate and harden the slices into the SolarGRANT Pro MVP integration; it must not be the first meaningful point of product consumption.

### Platform Release 1.0 - Platform Execution Model and Roadmap

| Field | Value |
| --- | --- |
| Objective | Define the execution model, MVP definition, capability maturity model, prioritisation framework, build order, dependency graph, release roadmap, risk register, and decision gates. |
| Key deliverables | This document; sprint/release record; COM navigation updates. |
| Success criteria | Future Platform Release 1.x work can identify what to build first, why, dependencies, non-goals, maturity targets, and release gates. |
| Dependencies | Foundation Release 1.0 Milestone 3 platform architecture and capability model. |
| Non-goals | No code, migrations, UI, authentication, workflow, document, AI, notification, reporting, billing, or integration implementation. |

### Platform Release 1.1 - Identity and Organisation Foundation

| Field | Value |
| --- | --- |
| Objective | Define and implement the foundation for organisations, account ownership, actor identity, and tenant-aware boundaries, validated through a first SolarGRANT Pro identity slice. |
| Key deliverables | Feature specification; ADRs for identity and tenancy decisions if needed; organisation and actor model; basic platform identity APIs; SolarGRANT Pro proving slice; documentation updates. |
| SolarGRANT Pro proving slice | Installer organisations, internal Clada users, organisation ownership, and basic account identity. |
| Success criteria | SolarGRANT Pro can associate users, customers, and operational data with the correct organisation and actor context in production or production-like use. |
| Dependencies | Platform Release 1.0; security and privacy review. |
| Non-goals | Full SSO suite, billing, partner self-service, marketplace tenancy, advanced customer portal. |

### Platform Release 1.2 - Users, Roles, Permissions, and Audit Foundation

| Field | Value |
| --- | --- |
| Objective | Provide safe access control and traceability for platform actions, validated by protecting and auditing one real SolarGRANT Pro workflow. |
| Key deliverables | User model; role assignment; permission contract; authorization checks for core platform actions; audit event model; activity history; SolarGRANT Pro protected workflow slice; tests. |
| SolarGRANT Pro proving slice | Protect one real SolarGRANT Pro workflow and record audit events for that workflow. |
| Success criteria | Material actions in the selected SolarGRANT Pro workflow can be authorized and audited with actor, organisation, timestamp, subject, and action context. |
| Dependencies | Platform Release 1.1. |
| Non-goals | Complex ABAC engine, custom role scripting, SIEM replacement, full event-sourcing architecture. |

### Platform Release 1.3 - Workflow Foundation

| Field | Value |
| --- | --- |
| Objective | Create reusable workflow state, transition, ownership, and review mechanics, validated by migrating one genuine SolarGRANT Pro lead workflow. |
| Key deliverables | Workflow feature specification; workflow state model; transition APIs; audit integration; SolarGRANT Pro lead workflow migration slice; workflow configuration proposal. |
| SolarGRANT Pro proving slice | Migrate one genuine lead workflow to the platform workflow engine. |
| Success criteria | The selected SolarGRANT Pro lead workflow runs through platform workflow contracts without owning generic workflow mechanics. |
| Dependencies | Platform Release 1.2. |
| Non-goals | Visual workflow builder, arbitrary automations, cross-product workflow marketplace. |

### Platform Release 1.4 - Document Foundation

| Field | Value |
| --- | --- |
| Objective | Create reusable document collection, metadata, review, and pack-preparation foundations, validated by migrating one homeowner document workflow. |
| Key deliverables | Document feature specification; storage and access rules; document metadata model; review state; audit integration; SolarGRANT Pro homeowner document workflow slice; checklist configuration proposal. |
| SolarGRANT Pro proving slice | Migrate one homeowner document workflow to the platform document foundation. |
| Success criteria | The selected homeowner document workflow can be uploaded, tracked, reviewed, and audited without hard-coding document mechanics inside SolarGRANT Pro. |
| Dependencies | Platform Release 1.3; privacy/security review. |
| Non-goals | Autonomous document approval, broad OCR platform, public document API, final AI extraction workflows. |

### Platform Release 1.5 - Notifications and Communications Foundation

| Field | Value |
| --- | --- |
| Objective | Create reusable notification request, delivery status, communication history, and provider-boundary foundations, validated by one real SolarGRANT Pro reminder or follow-up. |
| Key deliverables | Notification specification; message event model; email/SMS provider interface; consent and audit expectations; SolarGRANT Pro reminder or follow-up slice; operational notification patterns. |
| SolarGRANT Pro proving slice | Send one real reminder or follow-up through the platform notification service. |
| Success criteria | SolarGRANT Pro can send the selected reminder or follow-up through a platform boundary with delivery status and audit context. |
| Dependencies | Platform Release 1.4; integration boundary review. |
| Non-goals | Marketing automation, bulk campaigns, provider marketplace, autonomous communication journeys. |

### Platform Release 1.6 - Module Configuration Foundation

| Field | Value |
| --- | --- |
| Objective | Create the configuration boundary that lets product modules adapt platform capabilities without changing platform internals, validated by one SolarGRANT Pro configuration-driven workflow. |
| Key deliverables | Module configuration specification; configuration schema; validation rules; permission and audit controls; SolarGRANT Pro configuration-driven workflow slice; SolarGRANT Pro configuration baseline. |
| SolarGRANT Pro proving slice | Configure one SolarGRANT Pro workflow without changing platform code. |
| Success criteria | The selected SolarGRANT Pro workflow can change approved statuses, labels, checklist values, or thresholds through documented configuration contracts. |
| Dependencies | Platform Release 1.5. |
| Non-goals | Low-code builder, customer-authored automation scripts, partner module SDK. |

### Platform Release 1.7 - AI Assistance Governance

| Field | Value |
| --- | --- |
| Objective | Govern AI assistance across modules with review, traceability, permissions, audit, and provider boundaries, validated by one SolarGRANT Pro AI-assisted feature. |
| Key deliverables | AI assistance feature specification; AI review states; prompt/output traceability model; confidence/uncertainty handling; OpenAI provider adapter boundary; SolarGRANT Pro governed AI slice; human-review rules. |
| SolarGRANT Pro proving slice | Govern one AI-assisted SolarGRANT Pro feature through the platform AI capability. |
| Success criteria | The selected AI-assisted SolarGRANT Pro feature is traceable, permission-aware, auditable, and human-reviewed before consequential use. |
| Dependencies | Platform Release 1.6; AI engineering rules; privacy/security review. |
| Non-goals | Autonomous grant decisions, unreviewed customer-facing AI, AI provider marketplace. |

### Platform Release 1.8 - Reporting and Operational Metrics

| Field | Value |
| --- | --- |
| Objective | Provide reusable operational metrics from workflow, audit, document, notification, and AI events, validated by one real SolarGRANT Pro operational dashboard. |
| Key deliverables | Reporting specification; metric definitions; pipeline visibility; SolarGRANT Pro operational dashboard slice; operational dashboards or report APIs; audit-aligned event sources. |
| SolarGRANT Pro proving slice | Produce one real operational dashboard using platform events. |
| Success criteria | SolarGRANT Pro can show the selected operational dashboard from platform events with traceable source definitions. |
| Dependencies | Platform Release 1.7. |
| Non-goals | BI warehouse, financial forecasting, cross-product benchmarking, commercial billing automation. |

### Product Release 2.0 - SolarGRANT Pro MVP Integration

| Field | Value |
| --- | --- |
| Objective | Consolidate and harden the Platform Release 1.x SolarGRANT Pro proving slices into the SolarGRANT Pro MVP integration. |
| Key deliverables | SolarGRANT Pro feature specifications; module configuration; integration plan; migration plan if needed; proving-slice hardening plan; user-facing release notes; production readiness review. |
| Success criteria | SolarGRANT Pro consumes platform identity, permissions, audit, workflow, documents, notifications, module configuration, AI governance, and reporting through documented platform contracts, with each capability already validated through at least one earlier proving slice. |
| Dependencies | Platform Releases 1.1 through 1.8. |
| Non-goals | Second product module, partner marketplace, public SDK, broad codebase renaming. |

### Later Platform 1.x Candidates

| Release candidate | Objective | Entry condition |
| --- | --- | --- |
| Platform Release 1.9 - Integrations Framework | Standardize provider interfaces and adapter lifecycle. | Core platform APIs have production consumers and provider risks are clear. |
| Platform Release 1.10 - Billing and Commercial Operations | Support commercial packaging, account status, and billing-ready usage signals. | SolarGRANT Pro pricing/package assumptions are validated. |
| Platform Release 1.11 - Marketplace or Partner Extensibility | Explore partner/module extensibility. | Internal reuse is proven and support, billing, permissions, and API stability are ready. |

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Over-engineering before customer validation | Platform work delays SolarGRANT Pro and produces unused abstractions. | Keep MVP narrow, require release objectives, and defer marketplace, SDK, and low-code capabilities. |
| Premature abstraction | Platform APIs encode guessed reuse rather than real operating needs. | Let SolarGRANT Pro consume simple contracts first and only promote patterns with evidence. |
| SolarGRANT Pro delays | Platform foundation work blocks the first product module from reaching customers. | Prioritize dependencies that unlock SolarGRANT Pro consumption and avoid post-MVP capabilities during MVP releases. |
| Unclear ownership | Capabilities duplicate across platform, module, shared service, or integration layers. | Use the capability map, taxonomy, and decision framework before implementation. |
| AI reliability risk | AI output could be treated as authoritative or customer-facing without review. | Build AI governance after permissions, audit, workflow, documents, and module configuration; require human review for consequential outputs. |
| Compliance and GDPR risk | Personal data, documents, communication history, or AI traces could be mishandled. | Include privacy/security review in release gates and document retention, access, and audit expectations. |
| Multi-tenancy mistakes | Data or permissions could leak between organisations. | Build identity and organisation foundations first; test tenant boundaries before product integration. |
| Platform/product coupling | Clada OS could absorb SolarGRANT Pro implementation details. | Keep SEAI rules, solar language, and installer-specific promises inside SolarGRANT Pro or its business domain. |
| Reporting without trusted events | Metrics could be misleading if workflow or audit events are incomplete. | Build reporting after audit, workflow, documents, notifications, and AI governance events are stable. |
| Provider lock-in | Email, SMS, AI, or storage providers could leak into platform APIs. | Keep provider details behind integration interfaces and document approved exceptions with ADRs. |

## Decision Gates

Every Platform Release 1.x milestone must satisfy these gates before the next release begins.

| Gate | Required evidence |
| --- | --- |
| Scope gate | Release objective, in-scope items, non-goals, and affected capabilities are documented. |
| Dependency gate | The release does not depend on unavailable lower-level capabilities, or an ADR approves the exception. |
| Specification gate | Feature specifications exist for implementation work and include cross-cutting concerns. |
| Product validation gate | Each Platform Release 1.x defines and validates a small SolarGRANT Pro proving slice in production or production-like use. |
| ADR gate | Material architecture, security, privacy, API, provider, or dependency decisions are recorded. |
| Implementation gate | Code changes match approved specs and avoid unrelated product behaviour changes. |
| Validation gate | Relevant tests, lint, build, migration checks, link checks, and manual verification are complete or caveated. |
| Review gate | Architecture and product review are complete, with CEO approval where business trade-offs exist. |
| Documentation gate | COM docs, sprint records, indexes, and release notes are updated. |
| Release gate | Branch is reviewed, PR is merged, release tag is created where appropriate, and handoff notes identify the next milestone. |

## Non-Goals

This milestone does not:

- implement application code;
- create database migrations;
- implement authentication;
- change UI or user flows;
- change SolarGRANT Pro product functionality;
- add workflow, document, notification, AI, reporting, integration, billing, marketplace, or partner SDK code;
- restructure repository folders;
- rename product code;
- define detailed feature specifications for Platform Release 1.1 or later;
- approve speculative marketplace or partner extensibility implementation.

## Related Documents

- [README.md](README.md)
- [PLATFORM_VISION.md](PLATFORM_VISION.md)
- [PLATFORM_PRINCIPLES.md](PLATFORM_PRINCIPLES.md)
- [PLATFORM_CAPABILITY_MAP.md](PLATFORM_CAPABILITY_MAP.md)
- [CAPABILITY_DECISION_FRAMEWORK.md](CAPABILITY_DECISION_FRAMEWORK.md)
- [PLATFORM_DEPENDENCY_MAP.md](PLATFORM_DEPENDENCY_MAP.md)
- [PLATFORM_EVOLUTION_POLICY.md](PLATFORM_EVOLUTION_POLICY.md)
- [../06-sprints/PLATFORM_RELEASE_1_0_EXECUTION_MODEL.md](../06-sprints/PLATFORM_RELEASE_1_0_EXECUTION_MODEL.md)
