import type { ApplicationEnvironment } from './database-safety';

export const PASSWORD_RESET_PRODUCTION_ORIGIN =
  'https://seai-grant-software.vercel.app';

export type PasswordResetOriginConfiguration = {
  applicationEnvironment: ApplicationEnvironment;
  configuredOrigin?: string;
  previewOriginAllowlist?: readonly string[];
};

export class PasswordResetOriginConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordResetOriginConfigurationError';
  }
}

function parseExactOrigin(value: string | undefined): URL {
  if (!value?.trim()) {
    throw new PasswordResetOriginConfigurationError(
      'A canonical password reset origin is required.'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new PasswordResetOriginConfigurationError(
      'The canonical password reset origin is invalid.'
    );
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/' ||
    !['http:', 'https:'].includes(parsed.protocol)
  ) {
    throw new PasswordResetOriginConfigurationError(
      'The canonical password reset origin must contain only scheme and authority.'
    );
  }
  return parsed;
}

function isLoopback(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function resolvePasswordResetCanonicalOrigin(
  configuration: PasswordResetOriginConfiguration
): string {
  const parsed = parseExactOrigin(configuration.configuredOrigin);
  const origin = parsed.origin;

  if (configuration.applicationEnvironment === 'production') {
    if (origin !== PASSWORD_RESET_PRODUCTION_ORIGIN) {
      throw new PasswordResetOriginConfigurationError(
        'Production password reset origin does not match the approved origin.'
      );
    }
    return origin;
  }

  if (origin === PASSWORD_RESET_PRODUCTION_ORIGIN) {
    throw new PasswordResetOriginConfigurationError(
      'The Production password reset origin is forbidden outside Production.'
    );
  }

  if (
    configuration.applicationEnvironment === 'development' ||
    configuration.applicationEnvironment === 'test'
  ) {
    if (!isLoopback(parsed.hostname) || parsed.protocol !== 'http:') {
      throw new PasswordResetOriginConfigurationError(
        'Development and test password reset origins must use HTTP loopback.'
      );
    }
    return origin;
  }

  const allowlist = configuration.previewOriginAllowlist ?? [];
  if (
    parsed.protocol !== 'https:' ||
    !allowlist.some((approvedOrigin) => {
      try {
        return parseExactOrigin(approvedOrigin).origin === origin;
      } catch {
        return false;
      }
    })
  ) {
    throw new PasswordResetOriginConfigurationError(
      'Preview password reset origin is not an approved stable HTTPS origin.'
    );
  }

  return origin;
}
