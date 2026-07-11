# Active Sprint

| Field | Value |
| --- | --- |
| Document ID | SPRINT-ACTIVE-001 |
| Status | Active |
| Owner | Clada Systems Product and Engineering |
| Review cycle | Every sprint |
| Last reviewed | 2026-07-10 |

## Sprint

Platform Release 1.3 - Workflow Foundation.

## Objective

Implement the first reusable Clada OS Workflow Foundation, proved by migrating SolarGRANT Pro lead pipeline progression to the platform workflow service.

## In Scope

- reusable workflow definitions
- reusable stage definitions
- reusable transition rules
- transition validation
- workflow execution service
- workflow instances
- workflow transition history
- workflow-aware audit integration
- permission-aware transition execution
- SolarGRANT Pro lead pipeline proving slice
- automated unit and PostgreSQL integration tests
- COM, ADR, feature specification, sprint, architecture, roadmap, security, and debt documentation updates
- pull request to `main`

## Out Of Scope

- BPMN engine
- visual workflow builder
- conditional workflow designer
- parallel workflow execution
- timers or SLA engine
- notification engine
- document engine
- AI workflow decisions
- workflow automation rules
- custom scripting
- customer-configurable workflows
- broad UI redesign
- Platform Release 1.4 implementation

## Definition Of Done

Platform Release 1.3 is complete when the workflow foundation is specified, implemented, tested, documented, validated, and proved through SolarGRANT Pro lead pipeline progression; a pull request is opened to `main`; and Platform Release 1.4 has not begun.
