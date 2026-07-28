import {
  VERIFIER_EXIT_CODES,
  type VerifierMode
} from './lineage-verifier';

export type VerifierCommandDecision =
  | { kind: 'continue'; exitCode: 0 }
  | { kind: 'verified-pending-blocked'; exitCode: 20 }
  | { kind: 'unsafe-failure'; exitCode: number };

const acceptedExitCodes: Record<VerifierMode, readonly number[]> = {
  'strict-status': [VERIFIER_EXIT_CODES.VERIFIED_CLEAN],
  'strict-preflight': [VERIFIER_EXIT_CODES.VERIFIED_CLEAN],
  'strict-postflight': [VERIFIER_EXIT_CODES.VERIFIED_CLEAN],
  'production-status': [
    VERIFIER_EXIT_CODES.VERIFIED_CLEAN,
    VERIFIER_EXIT_CODES.VERIFIED_PENDING_BLOCKED
  ],
  'production-preflight': [VERIFIER_EXIT_CODES.VERIFIED_CLEAN],
  'production-postflight': [VERIFIER_EXIT_CODES.VERIFIED_CLEAN]
};

export function acceptedVerifierExitCodes(mode: VerifierMode): readonly number[] {
  return acceptedExitCodes[mode];
}

export function classifyVerifierExit(
  mode: VerifierMode,
  exitCode: number
): VerifierCommandDecision {
  if (!acceptedVerifierExitCodes(mode).includes(exitCode)) {
    return { kind: 'unsafe-failure', exitCode };
  }
  if (exitCode === VERIFIER_EXIT_CODES.VERIFIED_PENDING_BLOCKED) {
    return { kind: 'verified-pending-blocked', exitCode };
  }
  return { kind: 'continue', exitCode: VERIFIER_EXIT_CODES.VERIFIED_CLEAN };
}

export function productionPendingBlockEvidence() {
  return {
    eventVersion: 'adr-0024-command-boundary/v1',
    mode: 'production-status',
    verifierExitCode: VERIFIER_EXIT_CODES.VERIFIED_PENDING_BLOCKED,
    finalDecision: 'verified-pending-blocked',
    pendingMigration: '20260724180000_password_reset_foundation',
    deploymentAllowed: false,
    migrationApplied: false
  } as const;
}
