import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptedVerifierExitCodes,
  classifyVerifierExit,
  productionPendingBlockEvidence
} from '../../lib/verifier-command-policy';
import { VERIFIER_EXIT_CODES, type VerifierMode } from '../../lib/lineage-verifier';

const modes: VerifierMode[] = [
  'strict-status',
  'strict-preflight',
  'strict-postflight',
  'production-status',
  'production-preflight',
  'production-postflight'
];

test('exit zero continues normally in every verifier mode', () => {
  for (const mode of modes) {
    assert.deepEqual(classifyVerifierExit(mode, 0), { kind: 'continue', exitCode: 0 });
  }
});

test('only Production status recognises exit 20 and preserves the deliberate block', () => {
  assert.deepEqual(acceptedVerifierExitCodes('production-status'), [0, 20]);
  assert.deepEqual(classifyVerifierExit('production-status', 20), {
    kind: 'verified-pending-blocked',
    exitCode: 20
  });
  for (const mode of modes.filter((mode) => mode !== 'production-status')) {
    assert.deepEqual(acceptedVerifierExitCodes(mode), [0]);
    assert.deepEqual(classifyVerifierExit(mode, 20), {
      kind: 'unsafe-failure',
      exitCode: 20
    });
  }
});

test('Production status treats every other verifier failure as unsafe', () => {
  for (const exitCode of [
    VERIFIER_EXIT_CODES.ATTESTATION_INACTIVE,
    VERIFIER_EXIT_CODES.ATTESTATION_EXPIRED,
    VERIFIER_EXIT_CODES.IDENTITY_MISMATCH,
    VERIFIER_EXIT_CODES.INVENTORY_MISMATCH,
    VERIFIER_EXIT_CODES.LEDGER_MISMATCH,
    VERIFIER_EXIT_CODES.SCHEMA_MISMATCH,
    VERIFIER_EXIT_CODES.UNSAFE_CONFIGURATION,
    VERIFIER_EXIT_CODES.INTERNAL_ERROR
  ]) {
    assert.deepEqual(classifyVerifierExit('production-status', exitCode), {
      kind: 'unsafe-failure',
      exitCode
    });
  }
});

test('pending block evidence is stable, secret-free, and cannot imply deployment continuation', () => {
  const evidence = productionPendingBlockEvidence();
  assert.deepEqual(evidence, {
    eventVersion: 'adr-0024-command-boundary/v1',
    mode: 'production-status',
    verifierExitCode: 20,
    finalDecision: 'verified-pending-blocked',
    pendingMigration: '20260724180000_password_reset_foundation',
    deploymentAllowed: false,
    migrationApplied: false
  });
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /credential|secret|token|databaseUrl|postgres(?:ql)?:\/\//i
  );
});
