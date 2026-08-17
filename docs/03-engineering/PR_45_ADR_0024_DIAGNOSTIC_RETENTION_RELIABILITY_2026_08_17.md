# PR #45 ADR-0024 Diagnostic-Retention Reliability

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-DIAGNOSTIC-RETENTION-2026-08-17 |
| Status | Implemented and repository-tested |
| Owner | Clada Systems Engineering |
| Last reviewed | 2026-08-17 |
| Starting repository SHA | `55c25a0da620d767c7f27a22afadeb922670c9c9` |
| Scope | External operation reporting and diagnostic retention only |
| Production access | Prohibited and not performed |

## Decision

Diagnostic retention now belongs to the existing fixed Node operational
launcher. PowerShell is no longer in the critical retention path. The operator
command remains unchanged:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

That no-argument entry point still launches only pinned `pnpm@10.11.0` and the
fixed `db:lineage:capture-production-evidence` package script. Executable
resolution and the argument vector remain explicit, `shell: false` remains
mandatory, and no command string, `cmd.exe` parsing, PowerShell parsing,
interpolation or arbitrary command option was introduced.

The verifier and ADR-0024 acceptance predicates are unchanged. This repair
only ensures that a future verifier result cannot be destroyed by optional
report processing.

## Failure Boundary And Runtime

The repository-controlled path begins at
`scripts/launch-production-evidence-capture.ts`, resolves the package manager
in `lib/fixed-package-script-launcher.ts`, and invokes the fixed verifier
package script. That child behaved correctly in R16 and returned exit `25`.

The failed component was a one-off external operational/reporting wrapper; it
was not a committed repository file. Its effective path was:

```text
Windows PowerShell reporting wrapper
  -> node --import tsx scripts/launch-production-evidence-capture.ts
  -> resolved Node/Corepack executable with fixed argv and shell:false
  -> pnpm@10.11.0 db:lineage:capture-production-evidence
  -> repository verifier exit 25
  -> failing PowerShell hash/report decoration
```

| Runtime fact | Value |
| --- | --- |
| R16 external shell | Windows PowerShell 5.1, Desktop edition |
| CLR family | .NET Framework 4.x |
| Reproduced PowerShell | `5.1.26100.8875` |
| Reproduced CLR | `4.0.30319.42000` |
| Repository engine and CI target | Node `22.x` |
| Local repair-validation Node | `v24.14.1` |
| R16 child Node version | Not durably recorded; not reconstructed |

`SHA256.HashData` is a newer static API and does not exist on the R16
Windows PowerShell/.NET Framework surface. The ordered object was a
`System.Collections.Specialized.OrderedDictionary`; PowerShell dot assignment
cannot create an arbitrary new dictionary key. Neither failure was caused by
Node child-process argument handling or `tsx`. The diagnostic first became
available when the fixed child completed, but the external wrapper retained it
only in memory and attempted both unsupported operations before writing a
file. Its exception therefore destroyed access to the detail while leaving the
repository exit `25` known.

## Before And After

Before the repair, a one-off PowerShell wrapper captured child output in
memory, then tried to hash and decorate it. Unsupported CLR and ordered-object
operations could fail before any durable artifact existed.

After the repair, Node receives the child output as raw `Buffer` values and
uses this order:

1. Create an exclusive operation directory outside Git.
2. Atomically write and flush `operation-boundary-start.json` before launch.
3. Atomically write and flush `operation-boundary-child-start.json`.
4. Launch the one fixed command once and capture stdout, stderr, exit and
   signal without text encoding.
5. Apply the mandatory secret-like-output safety check.
6. Atomically write and flush `child-stdout.bin` and `child-stderr.bin`.
7. Atomically write and flush
   `operation-boundary-child-complete.json`, including the authoritative child
   exit and exact child timestamps.
8. Only then hash, parse, enrich and serialize optional reporting artifacts.

Atomic files are written to a unique temporary path with restrictive mode,
flushed, closed and renamed. A best-effort parent-directory flush is performed
where the host supports it. Operation directories cannot be reused, so a
reporting failure cannot trigger or conceal an automatic retry.

## Artifact Model

The default external root is:

```text
~/.clada-systems/ADR0024/<change-id>/
```

The path is derived only from the fixed root and a validated ADR-0024 change
ID. A normal completed reporting set contains:

| Artifact | Purpose |
| --- | --- |
| `operation-boundary-start.json` | Repository SHA and exact operation start in UTC and Europe/Dublin |
| `operation-boundary-child-start.json` | Exact child start and fixed operator command |
| `child-stdout.bin` | Exact permitted stdout bytes, including empty output |
| `child-stderr.bin` | Exact permitted stderr bytes, including typed diagnostics |
| `operation-boundary-child-complete.json` | Child exit, signal, completion time and raw references |
| `diagnostic.json` | Parsed safe diagnostic when the fixed format is available |
| `operation-boundary.json` | Hashes, classification, stage, invariant and reporting result |

If optional processing fails, `reporting-error.json` records a safe error type,
the reporting stage, completion time and both exits when that file can be
written. It never replaces or deletes the already-retained raw artifacts or
child-complete boundary.

## Exit Semantics

The repository child result is authoritative and stored separately from the
wrapper result:

| Child result | Optional reporting result | Wrapper exit |
| --- | --- | --- |
| Non-zero typed repository exit | Complete | Exact child exit |
| Non-zero typed repository exit | Failed after retention | Exact child exit |
| `0` | Complete | `0` |
| `0` | Failed after retention | Operational reporting exit `91` |
| No child status | Any | Operational reporting exit `91` |

For example, a child exit `25` remains `repositoryExit=25` and wrapper exit
`25` even if hashing fails. The reporting artifact separately records
`reportingStatus=failed`. The launcher also emits a fixed safe reporting-layer
message. It does not translate the repository result into generic exit `1` or
`70`.

## Hashing, Timestamps And Secret Safety

Raw retained bytes are hashed with Node's streaming-compatible
`createHash('sha256').update(bytes).digest('hex')`. No PowerShell or CLR
cryptography API is involved, so the unavailable static `SHA256.HashData` API
is no longer relevant.

Operation start is retained before the child launch. Child start and child
completion are independent durable timestamps. Reporting completion is a
fourth timestamp and never overwrites an earlier one. Every timestamp records
an ISO-8601 UTC value and a Europe/Dublin value with explicit offset. No value
is reconstructed from file metadata.

The fixed repository output is contractually secret-free. A mandatory final
retention guard checks for connection URLs, credential assignments, private
keys and common token forms. If a stream is unexpectedly secret-like, its
contents are not written; a fixed marker records only the stream and original
byte length, and `exactChildBytes=false` makes the loss explicit. Environment
dumps, usernames, passwords, SQL and customer data are never added to the
boundary.

## Compatibility And Synthetic Validation

The synthetic harness never imports a database client or invokes the fixed
Production child. It covers:

- child exit `0` with output;
- typed exits `25`, `26` and `70`;
- empty stdout and stderr-only diagnostics;
- malformed and large diagnostics;
- raw binary byte hashing;
- hashing, serialization and report-construction failures;
- unexpected exceptions after child retention;
- secret-like-output blocking;
- exact timestamps;
- operation-directory reuse and single launch; and
- child-zero/reporting-failure exit `91`.

The smoke was also launched successfully from Windows PowerShell
`5.1.26100.8875`, Desktop edition, on CLR `4.0.30319.42000`; it printed
`retention OK`. This validates that PowerShell 5.1 may start the Node entry
point without participating in retention, hashing or report construction.

No Production credential, connection or command was used by these tests.
