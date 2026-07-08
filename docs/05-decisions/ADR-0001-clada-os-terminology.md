# ADR-0001: Establish Clada OS Terminology

| Field | Value |
| --- | --- |
| Document ID | ADR-0001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Quarterly |
| Last reviewed | 2026-07-08 |

## Context

The repository began as a SolarGRANT Pro project focused on SEAI solar grant workflows. Clada Systems is now evolving the work into Clada OS, a broader platform for contractor-led businesses. Without a clear terminology decision, future implementation and documentation may incorrectly treat SolarGRANT Pro as the company or full platform.

## Decision

Use the following terminology throughout new documentation and architecture work:

- Clada Systems: company
- Clada OS: platform
- SolarGRANT Pro: first product module

SolarGRANT Pro remains valid where the document or implementation refers specifically to the Irish solar grant module.

## Rationale

This keeps the initial market focus while creating a durable platform identity. It prevents solar-specific assumptions from shaping every future architecture decision and gives future modules a clear place in the product model.

## Consequences

- Documentation must distinguish platform capabilities from module capabilities.
- Future feature specs should classify work as platform, module, extraction candidate, or experiment.
- Existing code may still contain solar-specific names where they accurately describe current behaviour.
- Unsafe global replacements are not allowed.

## Alternatives Considered

Keeping SolarGRANT Pro as the platform name was rejected because it would constrain future markets and blur company identity.

Renaming all existing code immediately was rejected because this milestone is documentation-focused and must not change application behaviour.

## Follow-Up

Future milestones may rename implementation boundaries where doing so improves maintainability and is backed by a feature spec or ADR.
