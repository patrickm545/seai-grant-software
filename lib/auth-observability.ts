import { randomUUID } from 'node:crypto';
import { DatabaseSafetyError } from './database-safety';

export type PilotAuthFailureCategory =
  | 'auth_configuration_invalid'
  | 'database_safety_rejection'
  | 'database_schema_mismatch'
  | 'database_unavailable'
  | 'authentication_infrastructure_failure';

type SafeLogger = Pick<Console, 'error'>;

function prismaErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

export function classifyPilotAuthInfrastructureFailure(error: unknown): PilotAuthFailureCategory {
  if (error instanceof DatabaseSafetyError) return 'database_safety_rejection';

  const code = prismaErrorCode(error);
  if (code === 'P2021' || code === 'P2022') return 'database_schema_mismatch';
  if (code?.startsWith('P1')) return 'database_unavailable';

  if (error instanceof Error && error.message.startsWith('AUTH_SESSION_PEPPER ')) {
    return 'auth_configuration_invalid';
  }
  return 'authentication_infrastructure_failure';
}

export function safeRequestCorrelationId(request: Request) {
  for (const name of ['x-vercel-id', 'x-request-id']) {
    const candidate = request.headers.get(name)?.trim();
    if (candidate && /^[A-Za-z0-9._:-]{1,160}$/.test(candidate)) return candidate;
  }
  return randomUUID();
}

export function logPilotAuthInfrastructureFailure(args: {
  error: unknown;
  request: Request;
  logger?: SafeLogger;
}) {
  const logger = args.logger ?? console;
  logger.error('[pilot-auth] infrastructure failure', {
    event: 'pilot_auth_infrastructure_failure',
    category: classifyPilotAuthInfrastructureFailure(args.error),
    requestId: safeRequestCorrelationId(args.request)
  });
}
