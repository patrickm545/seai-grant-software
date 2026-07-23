import type { ApplicationEnvironment } from './database-safety';

export const MANUAL_LEAD_PRIVACY_GATE_ERROR_CODE = 'MANUAL_LEAD_PRIVACY_GATE_CLOSED' as const;
export const MANUAL_LEAD_PRIVACY_GATE_MESSAGE = 'Manual Lead Creation is not currently enabled for this environment.';

type ManualLeadPrivacyEnvironment = {
  APP_ENV?: string;
  MANUAL_LEAD_CREATION_ENABLED?: string;
};

const supportedApplicationEnvironments = new Set<ApplicationEnvironment>([
  'production',
  'preview',
  'development',
  'test'
]);

export type ManualLeadPrivacyGateState = {
  enabled: boolean;
  applicationEnvironment: ApplicationEnvironment | null;
};

export class ManualLeadPrivacyGateError extends Error {
  readonly code = MANUAL_LEAD_PRIVACY_GATE_ERROR_CODE;

  constructor() {
    super(MANUAL_LEAD_PRIVACY_GATE_MESSAGE);
    this.name = 'ManualLeadPrivacyGateError';
  }
}

export function getManualLeadPrivacyGateState(
  environment: ManualLeadPrivacyEnvironment = {
    APP_ENV: process.env.APP_ENV,
    MANUAL_LEAD_CREATION_ENABLED: process.env.MANUAL_LEAD_CREATION_ENABLED
  }
): ManualLeadPrivacyGateState {
  const candidate = environment.APP_ENV?.trim().toLowerCase();
  const applicationEnvironment = candidate && supportedApplicationEnvironments.has(candidate as ApplicationEnvironment)
    ? candidate as ApplicationEnvironment
    : null;

  return {
    applicationEnvironment,
    enabled: applicationEnvironment !== null && environment.MANUAL_LEAD_CREATION_ENABLED === 'true'
  };
}

export function isManualLeadCreationEnabled(environment?: ManualLeadPrivacyEnvironment) {
  return getManualLeadPrivacyGateState(environment).enabled;
}

export function requireManualLeadCreationEnabled() {
  if (!isManualLeadCreationEnabled()) throw new ManualLeadPrivacyGateError();
}
