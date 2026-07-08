# Engineering Standards

| Field | Value |
| --- | --- |
| Document ID | ENG-STANDARDS-001 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | Monthly during Foundation Release 1.0, then quarterly |
| Last reviewed | 2026-07-08 |

These standards define the baseline for implementation work.

## General Standards

- Prefer existing repository patterns over new abstractions.
- Keep changes small and focused.
- Avoid unrelated redesigns.
- Use clear names that reflect domain meaning.
- Preserve type safety and validation at boundaries.
- Keep business rules easy to locate and review.
- Update documentation when behaviour, architecture, or operations change.

## Data And Privacy

- Do not log secrets or sensitive customer data.
- Treat lead, customer, installer, document, and submission data as sensitive.
- Preserve auditability for eligibility, document review, approval, and submission support workflows.
- Make data retention or compliance changes only with documentation and review.

## Testing And Verification

Verification should match risk. Small documentation-only changes may need link and formatting review. Behaviour changes should include relevant automated tests, manual verification, or both.

When tests are not added, the pull request should explain why.

## Dependencies

Add dependencies only when they reduce meaningful complexity or provide proven capability the team should not maintain itself. Document major dependency decisions in an ADR.

## Commit Discipline

Commits should be small, focused, and named for the actual change. Documentation and implementation should travel together when a change affects both.
