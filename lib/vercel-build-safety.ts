export type VercelBuildEnvironment = 'production' | 'preview' | 'development';
export type VercelDatabasePreflightCommand = 'status' | 'migrate-preview';

function requireVercelBuildEnvironment(value: string | undefined, label: string): VercelBuildEnvironment {
  const normalised = value?.trim().toLowerCase();
  if (!normalised || !['production', 'preview', 'development'].includes(normalised)) {
    throw new Error(`${label} must identify production, preview, or development.`);
  }
  return normalised as VercelBuildEnvironment;
}

export function resolveVercelDatabasePreflight(environment: {
  VERCEL_ENV?: string;
  APP_ENV?: string;
}): {
  environment: VercelBuildEnvironment;
  databaseCommand: VercelDatabasePreflightCommand;
} {
  const vercelEnvironment = requireVercelBuildEnvironment(environment.VERCEL_ENV, 'VERCEL_ENV');
  const appEnvironment = requireVercelBuildEnvironment(environment.APP_ENV, 'APP_ENV');

  if (vercelEnvironment !== appEnvironment) {
    throw new Error('VERCEL_ENV and APP_ENV must identify the same deployment environment.');
  }

  return {
    environment: vercelEnvironment,
    databaseCommand: vercelEnvironment === 'preview' ? 'migrate-preview' : 'status'
  };
}
