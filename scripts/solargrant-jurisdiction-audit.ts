import {
  assertDatabaseOperationAllowed,
  formatDatabaseSafetyError,
  formatSafeDatabaseIdentity
} from '../lib/database-safety';
import { aggregateSolarGrantJurisdictionFacts } from '../lib/solargrant-jurisdiction-audit';

async function main() {
  if (process.argv.slice(2).length > 0) {
    console.error('DB_OPERATION_NOT_ALLOWED: The jurisdiction audit does not accept query arguments.');
    process.exitCode = 1;
    return;
  }

  const guarded = assertDatabaseOperationAllowed({
    operation: 'jurisdiction-audit',
    appEnvironment: process.env.APP_ENV,
    databaseEnvironment: process.env.DATABASE_ENVIRONMENT,
    databaseUrl: process.env.DATABASE_URL,
    expectedFingerprint: process.env.DATABASE_FINGERPRINT,
    productionFingerprint: process.env.PRODUCTION_DATABASE_FINGERPRINT,
    branchId: process.env.DATABASE_BRANCH_ID,
    productionJurisdictionAuditAcknowledgement: process.env.ACKNOWLEDGE_PRODUCTION_JURISDICTION_AUDIT,
    productionJurisdictionAuditChangeId: process.env.SOLARGRANT_JURISDICTION_AUDIT_CHANGE_ID
  });

  console.log(
    `Database safety guard passed: operation=jurisdiction-audit app=${guarded.appEnvironment} database=${guarded.databaseEnvironment} ${formatSafeDatabaseIdentity(guarded.identity)}`
  );

  const { prisma } = await import('../lib/prisma');
  try {
    const facts = await prisma.lead.findMany({
      select: {
        organisationId: true,
        county: true,
        eircode: true
      }
    });
    const aggregates = aggregateSolarGrantJurisdictionFacts(facts);
    console.log(JSON.stringify({ environment: guarded.appEnvironment, aggregates }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(formatDatabaseSafetyError(error));
  process.exitCode = 1;
});
