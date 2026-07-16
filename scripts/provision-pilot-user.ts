import { existsSync, readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity
} from '../lib/database-safety';
import { normalizePilotEmail } from '../lib/pilot-auth';
import { provisionPilotOrganisation } from '../lib/pilot-provisioning';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  for (const rawLine of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normaliseSlug(value: string) {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) {
    throw new Error('PILOT_ORGANISATION_SLUG must be a lowercase kebab-case slug of at most 64 characters.');
  }
  return slug;
}

async function main() {
  const guarded = assertDatabaseOperationAllowed({
    operation: 'pilot-provision',
    appEnvironment: process.env.APP_ENV,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl: process.env.DATABASE_URL,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID,
    productionProvisioningAcknowledgement: process.env.ACKNOWLEDGE_PRODUCTION_PROVISIONING,
    productionProvisioningChangeId: process.env.PRODUCTION_PROVISION_CHANGE_ID
  });

  const organisationName = requiredEnvironment('PILOT_ORGANISATION_NAME');
  const organisationSlug = normaliseSlug(requiredEnvironment('PILOT_ORGANISATION_SLUG'));
  const ownerName = requiredEnvironment('PILOT_OWNER_NAME');
  const ownerEmail = normalizePilotEmail(requiredEnvironment('PILOT_OWNER_EMAIL'));
  const ownerPassword = requiredEnvironment('PILOT_OWNER_PASSWORD');
  const seaiCompanyId = requiredEnvironment('PILOT_INSTALLER_SEAI_COMPANY_ID');

  const prisma = new PrismaClient();
  try {
    await provisionPilotOrganisation(prisma, {
      organisationName,
      organisationSlug,
      ownerName,
      ownerEmail,
      ownerPassword,
      seaiCompanyId,
      websiteDomain: process.env.PILOT_INSTALLER_WEBSITE_DOMAIN?.trim(),
      county: process.env.PILOT_INSTALLER_COUNTY?.trim()
    });

    console.log(
      `Pilot provisioned: organisation=${organisationSlug} owner=${ownerEmail} app=${guarded.appEnvironment} ${formatSafeDatabaseIdentity(guarded.identity)}`
    );
    console.log('The plaintext password was not printed or stored by this command.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (error instanceof Error && error.name !== 'DatabaseSafetyError') {
    console.error(`Pilot provisioning failed: ${error.message}`);
  } else {
    console.error(formatDatabaseSafetyError(error));
  }
  process.exit(1);
});
