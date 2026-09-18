# PR #45 ADR-0024 Production Evidence R16

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-PRODUCTION-EVIDENCE-R16-2026-08-13 |
| Status | Closed - repository result retained, detailed diagnostic lost by external reporting |
| Owner | Patrick McKenna |
| Last reviewed | 2026-08-17 |
| Change ID | `CHG-2026-08-13-ADR0024-PROD-EVIDENCE-R16` |
| Authorised repository SHA | `55c25a0da620d767c7f27a22afadeb922670c9c9` |
| Branch | `ops/adr-0024-production-evidence-activation` |
| Repository result | `LEDGER_MISMATCH`, typed exit `25` |
| Disposition | Permanently closed; must not be reused or retried |

## Authoritative Outcome

R16 passed its pre-access gates and invoked the fixed repository Production
evidence launcher exactly once. The repository opened the guarded Production
connection and completed its first read-only transaction. The following fixed
operations are known to have completed:

- `SET TRANSACTION READ ONLY`;
- connected-identity read;
- migration-ledger read; and
- fixed catalog read.

The repository then failed closed with `LEDGER_MISMATCH`, typed exit `25`.
There was no retry. The attestation remained pending with zero captures and
zero approvals. No Production status, migration, deployment, promotion or
alias operation followed.

The external reporting layer failed after the child process returned. It did
not durably retain the child's detailed secret-free output before attempting
optional report processing. Therefore these facts are unavailable and must
not be inferred:

- the exact migration or record;
- the repository stage or invariant;
- mismatching fields or tuple results;
- a candidate-matrix comparison;
- exact operation start and child-completion timestamps; and
- any structured diagnostic that was present only in wrapper memory.

R16 produced no accepted capture, digest or attestation evidence. Its typed
exit and classification are authoritative; a later repository or candidate
matrix cannot be used to reconstruct the lost diagnostic.

## Reporting-Layer Failure

The failure was outside the repository verifier. The one-off operational
wrapper ran in Windows PowerShell 5.1 on CLR/.NET Framework 4.x and made three
unsafe reliability assumptions:

1. It called `[System.Security.Cryptography.SHA256]::HashData(...)`, an API
   unavailable on that runtime.
2. It attempted dot-property assignment for a new field on an ordered
   dictionary, which that object does not support.
3. It retained the child output only in memory until hashing and report
   decoration completed.

The repository launcher and verifier behaved correctly: they executed the
fixed read-only path and returned the fail-closed typed exit. The external
wrapper then lost the detailed diagnostic while processing it.

The repository-only repair is documented in
[ADR-0024 diagnostic-retention reliability](PR_45_ADR_0024_DIAGNOSTIC_RETENTION_RELIABILITY_2026_08_17.md).

## Safety And Closure

- The R16 transaction was explicitly read-only.
- No Production write or migration occurred.
- No manual SQL was executed.
- No complete evidence was accepted.
- No attestation field was activated.
- No deployment, promotion or alias movement occurred.
- The missing diagnostic is not a basis for a checksum tuple or verifier
  acceptance change.
- R16 remains permanently closed.

This record grants no R17 authority. Any later operation requires a new change
ID and separate approval after the retention repair is reviewed and validated.
