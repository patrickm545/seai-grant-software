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
  | 'evidence-serialization';

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
