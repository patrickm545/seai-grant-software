import { LineageVerifierError } from './lineage-verifier';

export type StrictVerifierStage =
  | 'strict-transaction'
  | 'strict-read-only-setup'
  | 'strict-connected-identity'
  | 'strict-migration-ledger'
  | 'strict-catalog'
  | 'strict-lineage-verification'
  | 'strict-secret-free-validation'
  | 'strict-evidence-serialization';

export type StrictVerifierFailureCategory =
  | 'database-authentication-failed'
  | 'database-unreachable'
  | 'database-connection-timeout'
  | 'database-not-found'
  | 'database-operation-timeout'
  | 'database-connection-closed'
  | 'database-pool-timeout'
  | 'transaction-conflict'
  | 'database-name-resolution-failed'
  | 'prisma-request-failed'
  | 'typed-verifier-failure'
  | 'response-normalization-failed'
  | 'response-parsing-failed'
  | 'unexpected-internal-error'
  | 'unexpected-non-error';

type SafeFailureClassification = {
  category: StrictVerifierFailureCategory;
  errorCode: string | null;
};

const safeErrorCodePattern = /^(?:P\d{4}|E(?:AI_AGAIN|CONNREFUSED|CONNRESET|TIMEDOUT|NOTFOUND))$/;

const categoriesByCode: Readonly<Record<string, StrictVerifierFailureCategory>> = {
  P1000: 'database-authentication-failed',
  P1001: 'database-unreachable',
  P1002: 'database-connection-timeout',
  P1003: 'database-not-found',
  P1008: 'database-operation-timeout',
  P1017: 'database-connection-closed',
  P2024: 'database-pool-timeout',
  P2034: 'transaction-conflict',
  EAI_AGAIN: 'database-name-resolution-failed',
  ECONNREFUSED: 'database-unreachable',
  ECONNRESET: 'database-connection-closed',
  ETIMEDOUT: 'database-connection-timeout',
  ENOTFOUND: 'database-name-resolution-failed'
};

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;
  const code = Reflect.get(error, 'code');
  return typeof code === 'string' && safeErrorCodePattern.test(code) ? code : null;
}

export function classifyStrictVerifierFailure(error: unknown): SafeFailureClassification {
  if (error instanceof LineageVerifierError) {
    return { category: 'typed-verifier-failure', errorCode: null };
  }
  const errorCode = safeErrorCode(error);
  if (errorCode) {
    return {
      category: categoriesByCode[errorCode] ?? 'prisma-request-failed',
      errorCode
    };
  }
  if (error instanceof TypeError || error instanceof RangeError) {
    return { category: 'response-normalization-failed', errorCode: null };
  }
  if (error instanceof SyntaxError) {
    return { category: 'response-parsing-failed', errorCode: null };
  }
  return {
    category: error instanceof Error ? 'unexpected-internal-error' : 'unexpected-non-error',
    errorCode: null
  };
}

export class StrictVerifierStageError extends Error {
  constructor(
    public readonly stage: StrictVerifierStage,
    public readonly invariant: string,
    cause: unknown
  ) {
    super('Strict migration lineage verification failed at a guarded stage.', { cause });
    this.name = 'StrictVerifierStageError';
  }
}

export async function runStrictVerifierStage<T>(
  stage: StrictVerifierStage,
  invariant: string,
  operation: () => T | Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof StrictVerifierStageError) throw error;
    throw new StrictVerifierStageError(stage, invariant, error);
  }
}

export function safeStrictVerifierStageDiagnostic(error: StrictVerifierStageError) {
  const failure = classifyStrictVerifierFailure(error.cause);
  return (
    `stage=${error.stage}; invariant=${error.invariant}; category=${failure.category}; ` +
    `errorCode=${failure.errorCode ?? 'none'}`
  );
}
