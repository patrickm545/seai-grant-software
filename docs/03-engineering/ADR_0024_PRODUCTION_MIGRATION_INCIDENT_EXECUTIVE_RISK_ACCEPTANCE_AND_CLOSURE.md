# ADR-0024 Production Migration Incident — Executive Risk Acceptance and Closure

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-EXECUTIVE-RISK-ACCEPTANCE-CLOSURE-2026-09-18 |
| Status | Active; incident closed by explicit executive risk acceptance |
| Owner | Patrick McKenna, CEO / Production Owner |
| Review cycle | Immutable incident record; review only if superseded by a new explicit decision |
| Last reviewed | 2026-09-18 |
| Decision ID | `ADR-0024-EXECUTIVE-RISK-ACCEPTANCE-2026-09-18` |
| Authorised starting revision | `d9a19612ecf373b68325c344ef2c72d34b1e0260` |

## Decision

Patrick McKenna, acting as CEO and Production Owner of Clada Systems, accepts
the residual governance risk of closing the ADR-0024 Production migration
incident without satisfying or activating the independent qualified-human v7
approval path.

The machine-validated decision is
[the incident-specific executive risk-acceptance record](../../prisma/lineage-attestations/adr-0024-production-post-migration-executive-risk-acceptance-v1.json).
It is bound to ADR-0024, PR #45, the exact pending v7 Git artifact, the R2
evidence, the Production identity and the password-reset migration. It is not
reusable for another incident and does not provide a flag or general bypass.

## Technical Evidence Preserved

R2 change `CHG-2026-08-27-ADR0024-POST-MIGRATION-PROD-VERIFY-R2`
established the following through two deterministic read-only Production
captures:

- environment `production`, database `neondb`, Neon branch
  `br-cool-wave-abysq3lu` and database fingerprint
  `db_4e1d3bd23cff6801`;
- 16 repository migrations, 16 applied and zero pending;
- actual Production post-migration fingerprint
  `22bb1c7cfb799bbb8c8c7530702e543593ec5ff2294988237d34ad03df35c989`;
- capture hashes
  `f59fd81139d9a3a83954babc50b861742a6dd27d5d697dde5c318a1ea74c5866`
  and
  `a5ca135428fffb4c8266268b928fad0e5225d9c3239096135dbd542c0f1cbf44`;
- deterministic digest
  `89e0ef66a07f3390b83c378e323eca699cc71012b66ea601889eb5dc1a100a8b`;
- operation-boundary hash
  `d6c99565d205d61de619380f4c977bb36796d312243f0410812e0ad25d433227`;
- one canonical successful Production record for
  `20260724180000_password_reset_foundation`, checksum
  `cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7`;
  and
- the required post-migration catalog and preserved historical-lineage
  assertions.

This decision changes none of those facts. The complete evidence remains in
the [R2 verification record](PR_45_ADR_0024_POST_MIGRATION_PRODUCTION_VERIFICATION_R2.md).

## R4 Fingerprint Distinction

The earlier R4 postflight failure compared Production against an unsupported
expected fingerprint derived from a disposable database. It did not establish
that Production had the disposable fingerprint and did not establish that the
migration failed. R2 subsequently captured the actual Production-specific
fingerprint. The exact root cause remains documented in the
[R4 fingerprint investigation](PR_45_ADR_0024_R4_POST_MIGRATION_SCHEMA_FINGERPRINT_INVESTIGATION.md).

## V7 And Human Review State

The v7 artifact remains historically truthful at `pending-approval`. Its raw
Git-blob SHA-256 is
`9767c7c434976de0291bb77eafefa0cedd78ab0b24f99b57240c4da9e6faf0ee`.
It has zero qualifying approvals and no review, activation or expiry timestamp.
The v7 validator and original approval contract remain intact.

Peter Archer supplied this exact statement:

> “I am happy that the production schema matches the local test database. I have not reviewed the way the data is stored or structured, just that the schemas match - Peter Archer (Software engineer with 6 years experience)”

The statement is a limited, non-qualifying human review. It does not satisfy
the v7 `DATABASE_RELIABILITY_REVIEWER` contract and is not counted as an
approval. Its Production/local-test equality proposition is unsupported by the
governed fingerprint evidence. The executive decision stands independently of
this statement.

## Residual Risk Accepted

The Production Owner acknowledges that the original v7 independent-review
condition remains unfulfilled. He nevertheless accepts the residual governance
risk and supersedes that activation requirement only for this incident. The
technical R2 state is verified; the v7 independent-review state is unfulfilled;
the executive risk acceptance is accepted; and the ADR-0024 incident is closed.

This closure authorises return to normal SolarGRANT Pro development after
repository validation. It does not authorise a Production migration, manual
SQL, `prisma migrate resolve`, `prisma db push`, a Production write, deployment
or alias movement. It does not apply to another migration or incident. Any
future exception requires a new explicit repository decision.

## Validation Boundary

Repository validation must prove the exact risk-acceptance binding and preserve
the unchanged v7 history. This closure used no Production credential,
connection, query, write, migration, deployment or alias movement.
