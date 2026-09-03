export type ProductionEvidenceStage =
  | 'guarded-identity-configuration'
  | 'manifest-verification'
  | 'pending-attestation-verification'
  | 'operational-controls'
  | 'first-transaction'
  | 'first-read-only-setup'
  | 'first-connected-identity'
  | 'first-migration-ledger'
  | 'first-catalog'
  | 'first-evidence-generation'
  | 'second-transaction'
  | 'second-read-only-setup'
  | 'second-connected-identity'
  | 'second-migration-ledger'
  | 'second-catalog'
  | 'second-evidence-generation'
  | 'deterministic-comparison'
  | 'secret-free-validation'
  | 'evidence-serialization'
  | 'post-migration-guarded-identity-configuration'
  | 'post-migration-manifest-verification'
  | 'post-migration-retired-attestation-verification'
  | 'post-migration-operational-controls'
  | 'post-migration-first-transaction'
  | 'post-migration-first-read-only-setup'
  | 'post-migration-first-connected-identity'
  | 'post-migration-first-migration-ledger'
  | 'post-migration-first-catalog'
  | 'post-migration-first-evidence-generation'
  | 'post-migration-second-transaction'
  | 'post-migration-second-read-only-setup'
  | 'post-migration-second-connected-identity'
  | 'post-migration-second-migration-ledger'
  | 'post-migration-second-catalog'
  | 'post-migration-second-evidence-generation'
  | 'post-migration-deterministic-comparison'
  | 'post-migration-secret-free-validation'
  | 'post-migration-evidence-serialization';

export class ProductionEvidenceStageError extends Error {
  constructor(
    public readonly stage: ProductionEvidenceStage,
    public readonly invariant: string,
    cause: unknown
  ) {
    super('Production evidence capture failed at a guarded stage.', { cause });
    this.name = 'ProductionEvidenceStageError';
  }
}

export async function runProductionEvidenceStage<T>(
  stage: ProductionEvidenceStage,
  invariant: string,
  operation: () => T | Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ProductionEvidenceStageError) throw error;
    throw new ProductionEvidenceStageError(stage, invariant, error);
  }
}

export function safeProductionEvidenceStageDiagnostic(
  error: ProductionEvidenceStageError
) {
  return `stage=${error.stage}; invariant=${error.invariant}`;
}
