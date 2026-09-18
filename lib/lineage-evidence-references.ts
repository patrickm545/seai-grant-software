import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AttestationValidationError,
  type LineageAttestation
} from './lineage-attestation';

export function verifyRepositoryEvidenceReferences(
  repositoryRoot: string,
  attestation: LineageAttestation
) {
  for (const reference of attestation.evidenceReferences) {
    if (!reference.startsWith('docs/')) continue;
    const evidencePath = resolve(repositoryRoot, reference);
    if (!existsSync(evidencePath)) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        `Repository evidence reference does not exist: ${reference}`
      );
    }
  }
  for (const checksumEvidence of attestation.repositoryMigrationChecksumDivergences) {
    const checksumEvidencePath = resolve(
      repositoryRoot,
      checksumEvidence.checksumEvidenceReference
    );
    const checksumEvidenceSha256 = createHash('sha256')
      .update(readFileSync(checksumEvidencePath))
      .digest('hex');
    if (checksumEvidenceSha256 !== checksumEvidence.checksumEvidenceSha256) {
      throw new AttestationValidationError(
        'ATTESTATION_INVALID',
        'Production repository checksum divergence evidence digest differs.'
      );
    }
  }
  for (const historical of attestation.historicalResolvedMigrations) {
    for (const evidence of [
      {
        reference: historical.checksumEvidenceReference,
        sha256: historical.checksumEvidenceSha256
      },
      {
        reference: historical.lifecycleEvidenceReference,
        sha256: historical.lifecycleEvidenceSha256
      },
      {
        reference: historical.expectedSchemaInventoryReference,
        sha256: historical.expectedSchemaInventorySha256
      }
    ]) {
      const evidencePath = resolve(repositoryRoot, evidence.reference);
      const evidenceSha256 = createHash('sha256')
        .update(readFileSync(evidencePath))
        .digest('hex');
      if (evidenceSha256 !== evidence.sha256) {
        throw new AttestationValidationError(
          'ATTESTATION_INVALID',
          'Historical resolved migration repository evidence digest differs.'
        );
      }
    }
  }
}
