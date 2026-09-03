# ADR-0024 R3 Dotenv Credential-Boundary Repair

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-R3-DOTENV-CREDENTIAL-BOUNDARY-2026-08-19 |
| Status | Validated repository-only repair |
| Owner | Patrick McKenna |
| Review cycle | Before every separately authorised password-reset Production reconciliation |
| Last reviewed | 2026-08-19 |
| Approved baseline | `3ff4d4d74b1c0a56938926f64dd3d335d68b63eb` |
| Closed operation | `CHG-2026-08-19-ADR0024-PASSWORD-RESET-PROD-RECONCILIATION-R3` |
| Authoritative lineage operation | `CHG-2026-08-17-ADR0024-PROD-EVIDENCE-R19` |

## Decision

R3 is permanently closed. It stopped with `DB_URL_INVALID` before a Production
connection, query, transaction or migration. The approved and resulting R3
head remains `3ff4d4d74b1c0a56938926f64dd3d335d68b63eb`. This repository-only change
repairs credential-file decoding for future separately authorised operations;
it does not reinterpret or retry R3.

Dotenv-compatible decoding now belongs to the repository. The implementation
uses Node's maintained `node:util.parseEnv` parser, followed by a narrow
credential-file contract. The external R3 evidence wrapper remains a retained
historical artifact and is not the permanent source of parsing behavior.

## Mechanical Reproduction And Root Cause

The retained one-off R3 wrapper read the credential file, split and trimmed its
lines, checked for one `DATABASE_URL=` prefix, and then used:

```text
lines[0].slice('DATABASE_URL='.length)
```

For a synthetic line whose value was double quoted, that expression returned a
string beginning and ending with the quote bytes. The same occurred for single
quotes. An unquoted synthetic value did not retain boundary quotes. Passing the
quoted string into the existing `URL` constructor reproduced the exact
`DB_URL_INVALID` stop; using `parseEnv` returned the unquoted value exactly.

The failing code path is the historical external file
`adr0024-password-reset-r3-retention.mjs`, function
`loadProductionEnvironment`, lines 117-130. Its SHA-256 is
`446f0be70126c7614933832c391e9b02ffde45b50f87ede43ab30790508a2254`.
The defect was not in `getDatabaseIdentity`, the database guard, the lineage
verifier or Prisma. The wrapper confused dotenv source text with an already
decoded environment value.

R3 retained the following relevant immutable artifacts outside Git:

| Artifact | SHA-256 |
| --- | --- |
| `operation-boundary-start.json` | `d8d6fc8a31089607f6630eaf6b18c139efb1e82fa80f965b0b6f7f36afd5ca79` |
| `status-child-stderr.bin` | `cb2d716c8f6454e6ea30a80216fbaeee59cbe4db17b90335ee0b62921e4271ad` |
| `status-operation-boundary.json` | `edf41200a3047685043ccf7f1c32d66ae6eb93a2e569166e447f852bf4d7eb6f` |

The child started at `2026-08-19T12:18:20.989Z` and completed at
`2026-08-19T12:18:21.332Z` with repository exit `1`. The retained stderr is the
secret-free `DB_URL_INVALID` diagnostic. No guarded status, verifier or
migration process followed it.

## Parsing Contract

The fixed-purpose file is UTF-8 and contains exactly one single-line
`DATABASE_URL` declaration. Blank lines and comment-only lines are accepted;
any other variable is rejected. The following maintained dotenv behavior is
preserved:

- double-quoted, single-quoted, backtick-quoted and unquoted values;
- whitespace outside values;
- `export` before the exact key;
- inline comments outside quotes and literal `#` inside quotes;
- `=` characters, percent encoding, query strings and special URL characters;
- LF or CRLF line endings;
- an optional UTF-8 BOM.

Ambiguous or unsafe input fails closed. Duplicate declarations, missing or
empty values, malformed quotes, multiline values, bare carriage returns, NUL,
invalid UTF-8, extra declarations, non-regular files, symbolic links, files
larger than 64 KiB and files that change size while loading are rejected. A
missing path reports `ENV_FILE_MISSING`; missing or empty data reports
`DB_URL_MISSING`; every other file/parser problem reports `ENV_FILE_INVALID`.
No diagnostic contains the path, value or underlying parser exception.

Decoding does not validate or trust the URL. The exact decoded value is copied
into a child-only environment and then reaches the existing
`getDatabaseIdentity` and `assertDatabaseOperationAllowed` path. Invalid URLs,
protocols, environment labels and fingerprints continue to fail under the
existing database-safety classifications.

## Fixed Operational Boundary

`lib/database-credential-env.ts` owns loading and safe diagnostics.
`launchFixedGuardedDatabaseCommandFromEnvFile` admits only `status`,
`migrate-test` or `migrate-production`, resolves the checked-in
`scripts/run-database-command.ts` entrypoint, and spawns the resolved Node
executable with exact argv and `shell:false`.

`scripts/run-database-command-from-env-file.ts` is the fixed repository entry
for an operation wrapper. The file path is supplied through the dedicated
`DATABASE_CREDENTIAL_ENV_FILE` process variable; `DATABASE_URL` must be absent
at that outer boundary. The path variable is removed from the child environment
after loading. The script does not accept an executable or arbitrary argv and
does not retry a failed child.

No shell, `cmd.exe`, PowerShell evaluation, interpolation, substitution,
`eval`, arbitrary code execution or new dependency is involved. The ignored
credential file is never copied to repository evidence or Git.

## Windows And Focused Verification

Verification ran in Windows PowerShell `5.1.26100.9168` with Node `v24.14.1`;
the repository contract remains Node `22.x`, where `util.parseEnv` is also
available. Focused coverage passed 93 tests, including 15 new credential and
launcher cases. The tests prove quote removal, LF and CRLF, optional BOM,
comments, whitespace, query `=`, percent encoding, malformed and duplicate
input, regular-file restrictions, secret-safe diagnostics, existing
`DB_URL_INVALID`, exact paths containing spaces, terminal marker isolation,
fixed argv, `shell:false` and exact typed child-exit retention.

All fixtures are synthetic and contain no password-shaped credential value.

## Disposable PostgreSQL Proof

The repaired gate wrote a quoted CRLF synthetic credential file under its
unique system-temp root, left `DATABASE_URL` absent at the outer runner, and
loaded it through the repository boundary. The disposable fingerprint was
`db_b41917792425a5be`.

Strict preflight returned `verified-clean` with 15 canonical migrations and
only `20260724180000_password_reset_foundation` pending. The normal guarded
`migrate-test` runner applied checksum
`cd79313c15a7343aa101a8509552e7cc76b101c7f602799857b0951d8eb02cd7`
exactly once. Its internal postflight and the independent postflight both
returned `verified-clean`, with 16 applied migrations, zero pending and schema
fingerprint
`685ee5bdb7ec8fd76592d8cd8ed14f1e958046fdb38afe29600fe40f37ee7343`.
All 68 database-backed tests in 13 files passed.

The database proof took 45,871 ms across recorded stages. PostgreSQL stopped,
the loopback port closed, the temporary database directory was removed and the
synthetic credential file was absent after cleanup. The ignored local evidence
SHA-256 is
`229fb74a524f61df73ac840b60b2b4e9acc18c015201291e7e26f890d9266e10`.

## Complete Validation

The deterministic pre-Production gate passed all 12 stages in 135,437 ms:

| Validation | Result | Duration |
| --- | --- | ---: |
| Focused credential, launcher, retention, lineage and security tests | 93 passed | 1,621 ms |
| Full unit, platform and security suite | 529 passed | 8,156 ms |
| ESLint | Passed | 9,129 ms |
| TypeScript | Passed | 4,863 ms |
| Prisma schema validation | Passed | 846 ms |
| Production build without deployment | Passed | 54,189 ms |
| Manifest verification | Passed | 2,430 ms |
| Immutable migration history | Passed; 16 migrations | 2,177 ms |
| Active attestation validation | Passed | 450 ms |
| Markdown baseline | 79 pre-existing; zero changed/new | 3,707 ms |
| Links, metadata, JSON, secret scan and diff check | Passed | 915 ms |
| Disposable PostgreSQL gate | Passed | 46,954 ms |

The ignored full-gate report SHA-256 is
`bba361b364eee2c6ef75b7c694339f24c0abd4b796e69b7bf5e8de5b9aed3fe1`.

## Governance And Safety

The repair changes only credential loading and the local gate's exercise of
that boundary. R19 evidence, its two deterministic captures, all seven
ordinary Production checksum tuples, the pilot-auth historical-resolved state,
migration SQL, the immutable manifest, Production schema evidence, attestation
accountability, expiry/review controls and password-reset semantics are
unchanged.

No Production credential was loaded. No Production connection, query,
transaction, status, migration, manual SQL, `migrate resolve`, `db push`,
deployment, promotion or alias movement occurred. A future R4 requires a new
change ID, exact repaired head, fresh recovery and release gates, guarded
identity verification and separate explicit authorization.
