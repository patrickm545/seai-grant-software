# PR #45 ADR-0024 Final Windows Launcher Reliability

| Field | Value |
| --- | --- |
| Document ID | ENG-ADR-0024-WINDOWS-LAUNCHER-RELIABILITY-2026-08-04 |
| Status | Active |
| Owner | Clada Systems Engineering |
| Review cycle | After any fixed-launcher boundary change |
| Last reviewed | 2026-08-04 |
| Related closed operation | `CHG-2026-08-04-ADR0024-PROD-EVIDENCE-R5` |
| Repository baseline | `616e2891d6b500a1cf62ee6c03d43b082778ca54` |
| Scope | Repository launcher boundary and harmless local smoke only |

## R5 Stop Boundary

R5 stopped at the local launcher handoff before the repository launcher,
Corepack, pnpm, verifier or any database client started. The intended external
path was:

```text
Windows PowerShell wrapper
  -> ProcessStartInfo(node, explicit argv)
  -> scripts/launch-production-evidence-capture.ts
  -> Node spawnSync(resolved executable, fixed argv, shell:false)
  -> pinned Corepack/pnpm package script
  -> repository verifier
```

The first arrow failed. The external wrapper created `ProcessStartInfo` but
could not add any argument. It then started `node.exe` with an empty argument
vector. Node received standard input redirected from a non-interactive process,
exited `0`, and emitted no repository result. The wrapper detected that
impossible zero-without-output state and stopped with wrapper exit `91`.

No Production connection, transaction, query, migration, deployment or alias
operation occurred. R5 is permanently closed and is not retry authority.

## Exact Root Cause

The failing host was Windows PowerShell `5.1.26100.8875`, Desktop edition,
running CLR `4.0.30319.42000` and the .NET Framework `System` assembly version
`4.0.0.0`. In that runtime,
`System.Diagnostics.ProcessStartInfo.GetProperty("ArgumentList")` returns no
property. Accessing `$processStartInfo.ArgumentList` through PowerShell
therefore yielded `$null`, and each attempted `.Add(...)` failed.

The local runtime also reported Node `v24.14.1` and Corepack `0.34.6`, but
neither executed the intended script. `ProcessStartInfo.ArgumentList` is a
newer .NET API; its absence is specific to the Windows PowerShell 5.1/.NET
Framework wrapper path. It is not caused by Node child-process handling,
`tsx`, cmd.exe, Git Bash, Windows Terminal, VS Code, CI, Linux or macOS.
Those hosts do not change the fixed argv passed after Node code starts.

## Final Architecture

The repository does not use `ProcessStartInfo`. Its no-argument operator entry
point is invoked directly:

```text
node --import tsx scripts/launch-production-evidence-capture.ts
```

Inside Node, the launcher resolves exactly one executable and calls
`spawnSync(program, argv, { shell: false })`. Windows resolves `node.exe` plus
the adjacent Corepack JavaScript entry point. Linux and macOS resolve the
extensionless Corepack executable. Both pin `pnpm@10.11.0` and the exact
`db:lineage:capture-production-evidence` package script.

No PowerShell, cmd, terminal-host, command-string, interpolation or shell
fallback participates after the direct Node entry point starts. An empty fixed
argv now fails before process creation. The environment remains data only and
cannot alter the executable or argument vector.

## Harmless Smoke

The local smoke command is:

```text
corepack pnpm@10.11.0 --silent launcher:smoke
```

It uses the same executable resolver and Node `spawnSync` boundary to invoke a
fixed harmless package-script target with one fixed marker argument. The
target validates its exact `process.argv`; the outer smoke validates the exact
marker and prints only:

```text
launcher OK
```

The smoke imports no database client, reads no `DATABASE_URL`, invokes no
Production command and performs no write. Failure emits only a fixed safe
diagnostic and exits non-zero.

## Security And Portability

- executable candidates are exact, unique, real paths;
- caller arguments are prohibited at the operator and smoke entry points;
- the package manager and package scripts are constants;
- every process call uses an argv array and `shell: false`;
- environment values are never interpolated into executable or argv values;
- control characters, missing executables and ambiguous resolution fail
  closed;
- child launch errors expose only their safe OS error code; and
- PowerShell, cmd, Windows Terminal, VS Code, Git Bash, CI, Linux and macOS
  share the same post-entry-point invariant.

This repair does not authorise Production access. Any later evidence operation
requires a new change ID and complete fresh operational approval.
