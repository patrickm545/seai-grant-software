import type { PrismaClient } from '@prisma/client';

export type SyntheticCleanupTrackedIds = {
  organisationIds?: readonly string[];
  userIds?: readonly string[];
  membershipIds?: readonly string[];
  installerIds?: readonly string[];
  leadIds?: readonly string[];
  leadActivityIds?: readonly string[];
  leadDocumentIds?: readonly string[];
  sessionIds?: readonly string[];
  operationIds?: readonly string[];
  auditIds?: readonly string[];
};

export type SyntheticCleanupRecordSet = {
  organisationIds: string[];
  userIds: string[];
  membershipIds: string[];
  installerIds: string[];
  leadIds: string[];
  leadActivityIds: string[];
  leadDocumentIds: string[];
  sessionIds: string[];
  operationIds: string[];
  auditIds: string[];
};

export type SyntheticCleanupTable = {
  discovered: number;
  deleted: number;
  remaining: number;
};

export type SyntheticCleanupSummary = {
  discoveredRecordCount: number;
  deletedRecordCount: number;
  remainingRecordCount: number;
  verificationPassed: boolean;
  tableCounts: Record<keyof SyntheticCleanupRecordSet, SyntheticCleanupTable>;
};

const TABLES: Array<keyof SyntheticCleanupRecordSet> = [
  'organisationIds',
  'userIds',
  'membershipIds',
  'installerIds',
  'leadIds',
  'leadActivityIds',
  'leadDocumentIds',
  'sessionIds',
  'operationIds',
  'auditIds'
];

function unique(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))];
}

function emptyRecordSet(): SyntheticCleanupRecordSet {
  return {
    organisationIds: [],
    userIds: [],
    membershipIds: [],
    installerIds: [],
    leadIds: [],
    leadActivityIds: [],
    leadDocumentIds: [],
    sessionIds: [],
    operationIds: [],
    auditIds: []
  };
}

function inIds(ids: readonly string[]) {
  return { in: ids.length ? [...ids] : ['__pilot_rehearsal_no_match__'] };
}

function orWhere(conditions: Array<Record<string, unknown>>) {
  return conditions.length ? { OR: conditions } : { id: inIds([]) };
}

function mergeTracked(discovered: SyntheticCleanupRecordSet, tracked: SyntheticCleanupTrackedIds): SyntheticCleanupRecordSet {
  return {
    organisationIds: unique([...discovered.organisationIds, ...(tracked.organisationIds ?? [])]),
    userIds: unique([...discovered.userIds, ...(tracked.userIds ?? [])]),
    membershipIds: unique([...discovered.membershipIds, ...(tracked.membershipIds ?? [])]),
    installerIds: unique([...discovered.installerIds, ...(tracked.installerIds ?? [])]),
    leadIds: unique([...discovered.leadIds, ...(tracked.leadIds ?? [])]),
    leadActivityIds: unique([...discovered.leadActivityIds, ...(tracked.leadActivityIds ?? [])]),
    leadDocumentIds: unique([...discovered.leadDocumentIds, ...(tracked.leadDocumentIds ?? [])]),
    sessionIds: unique([...discovered.sessionIds, ...(tracked.sessionIds ?? [])]),
    operationIds: unique([...discovered.operationIds, ...(tracked.operationIds ?? [])]),
    auditIds: unique([...discovered.auditIds, ...(tracked.auditIds ?? [])])
  };
}

/**
 * Finds every rehearsal-owned row using the durable rehearsal marker and then
 * expands through the foreign-key graph. Tracked IDs are only an additive
 * fallback for rows whose marker was written immediately before an exception.
 */
export async function discoverSyntheticRecords(
  db: PrismaClient,
  rehearsalId: string,
  tracked: SyntheticCleanupTrackedIds = {}
): Promise<SyntheticCleanupRecordSet> {
  const discovered = emptyRecordSet();
  const organisations = await db.organisation.findMany({
    where: { slug: { contains: rehearsalId } },
    select: { id: true }
  });
  discovered.organisationIds = organisations.map(({ id }) => id);

  const installers = await db.installer.findMany({
    where: orWhere([
      { slug: { contains: rehearsalId } },
      { organisationId: inIds(discovered.organisationIds) }
    ]),
    select: { id: true }
  });
  discovered.installerIds = installers.map(({ id }) => id);

  const markerUsers = await db.user.findMany({
    where: orWhere([
      { id: { contains: rehearsalId } },
      { email: { contains: rehearsalId } }
    ]),
    select: { id: true }
  });
  discovered.userIds = markerUsers.map(({ id }) => id);

  const memberships = await db.organisationMembership.findMany({
    where: orWhere([
      { organisationId: inIds(discovered.organisationIds) },
      { userId: inIds(discovered.userIds) }
    ]),
    select: { id: true, userId: true }
  });
  discovered.membershipIds = memberships.map(({ id }) => id);
  discovered.userIds = unique([...discovered.userIds, ...memberships.map(({ userId }) => userId)]);

  const leads = await db.lead.findMany({
    where: orWhere([
      { email: { contains: rehearsalId } },
      { organisationId: inIds(discovered.organisationIds) },
      { installerId: inIds(discovered.installerIds) }
    ]),
    select: { id: true }
  });
  discovered.leadIds = leads.map(({ id }) => id);

  const leadActivities = await db.leadActivity.findMany({
    where: orWhere([
      { leadId: inIds(discovered.leadIds) },
      { title: { contains: rehearsalId } },
      { description: { contains: rehearsalId } }
    ]),
    select: { id: true }
  });
  discovered.leadActivityIds = leadActivities.map(({ id }) => id);

  const leadDocuments = await db.leadDocument.findMany({
    where: { leadId: inIds(discovered.leadIds) },
    select: { id: true }
  });
  discovered.leadDocumentIds = leadDocuments.map(({ id }) => id);

  const sessions = await db.authSession.findMany({
    where: { userId: inIds(discovered.userIds) },
    select: { id: true }
  });
  discovered.sessionIds = sessions.map(({ id }) => id);

  const operations = await db.provisioningOperation.findMany({
    where: orWhere([
      { idempotencyKey: { contains: rehearsalId } },
      { organisationId: inIds(discovered.organisationIds) },
      { approvedBy: inIds(discovered.userIds) }
    ]),
    select: { id: true }
  });
  discovered.operationIds = operations.map(({ id }) => id);

  const audits = await db.auditLog.findMany({
    where: orWhere([
      { organisationId: inIds(discovered.organisationIds) },
      { userId: inIds(discovered.userIds) },
      { membershipId: inIds(discovered.membershipIds) },
      { leadId: inIds(discovered.leadIds) },
      { provisioningOperationId: inIds(discovered.operationIds) },
      { source: { contains: rehearsalId } }
    ]),
    select: { id: true }
  });
  discovered.auditIds = audits.map(({ id }) => id);

  return mergeTracked(discovered, tracked);
}

function totalRecords(records: SyntheticCleanupRecordSet) {
  return TABLES.reduce((total, table) => total + records[table].length, 0);
}

export async function verifySyntheticCleanup(
  db: PrismaClient,
  rehearsalId: string
): Promise<SyntheticCleanupSummary> {
  const remaining = await discoverSyntheticRecords(db, rehearsalId);
  const tableCounts = Object.fromEntries(
    TABLES.map((table) => [table, { discovered: remaining[table].length, deleted: 0, remaining: remaining[table].length }])
  ) as SyntheticCleanupSummary['tableCounts'];
  const remainingRecordCount = totalRecords(remaining);
  return {
    discoveredRecordCount: remainingRecordCount,
    deletedRecordCount: 0,
    remainingRecordCount,
    verificationPassed: remainingRecordCount === 0,
    tableCounts
  };
}

export class SyntheticCleanupError extends Error {
  constructor(message: string, readonly summary?: SyntheticCleanupSummary) {
    super(message);
    this.name = 'SyntheticCleanupError';
  }
}

/** Deletes in FK-safe order and verifies by rediscovery. It is safe to call repeatedly. */
export async function cleanupSyntheticData(
  db: PrismaClient,
  rehearsalId: string,
  tracked: SyntheticCleanupTrackedIds = {}
): Promise<SyntheticCleanupSummary> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const records = await discoverSyntheticRecords(db, rehearsalId, tracked);
    const discoveredOnly = await discoverSyntheticRecords(db, rehearsalId);
    const discoveredRecordCount = totalRecords(discoveredOnly);
    const deletedCounts: Record<keyof SyntheticCleanupRecordSet, number> = Object.fromEntries(
      TABLES.map((table) => [table, 0])
    ) as Record<keyof SyntheticCleanupRecordSet, number>;
    try {
      deletedCounts.auditIds = (await db.auditLog.deleteMany({ where: { id: inIds(records.auditIds) } })).count;
      deletedCounts.sessionIds = (await db.authSession.deleteMany({ where: { id: inIds(records.sessionIds) } })).count;
      deletedCounts.leadActivityIds = (await db.leadActivity.deleteMany({ where: { id: inIds(records.leadActivityIds) } })).count;
      deletedCounts.leadDocumentIds = (await db.leadDocument.deleteMany({ where: { id: inIds(records.leadDocumentIds) } })).count;
      deletedCounts.leadIds = (await db.lead.deleteMany({ where: { id: inIds(records.leadIds) } })).count;
      deletedCounts.operationIds = (await db.provisioningOperation.deleteMany({ where: { id: inIds(records.operationIds) } })).count;
      deletedCounts.membershipIds = (await db.organisationMembership.deleteMany({ where: { id: inIds(records.membershipIds) } })).count;
      deletedCounts.installerIds = (await db.installer.deleteMany({ where: { id: inIds(records.installerIds) } })).count;
      deletedCounts.userIds = (await db.user.deleteMany({ where: { id: inIds(records.userIds) } })).count;
      deletedCounts.organisationIds = (await db.organisation.deleteMany({ where: { id: inIds(records.organisationIds) } })).count;
      const after = await verifySyntheticCleanup(db, rehearsalId);
      const tableCounts = Object.fromEntries(
        TABLES.map((table) => [
          table,
          {
            discovered: discoveredOnly[table].length,
            deleted: deletedCounts[table],
            remaining: after.tableCounts[table].remaining
          }
        ])
      ) as SyntheticCleanupSummary['tableCounts'];
      const summary: SyntheticCleanupSummary = {
        discoveredRecordCount,
        deletedRecordCount: Object.values(deletedCounts).reduce((total, count) => total + count, 0),
        remainingRecordCount: after.remainingRecordCount,
        verificationPassed: after.verificationPassed,
        tableCounts
      };
      if (!summary.verificationPassed) throw new SyntheticCleanupError('Synthetic cleanup left matching rows.', summary);
      return summary;
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        if (error instanceof SyntheticCleanupError) throw error;
        const after = await verifySyntheticCleanup(db, rehearsalId).catch(() => undefined);
        throw new SyntheticCleanupError('Synthetic cleanup failed.', after);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new SyntheticCleanupError('Synthetic cleanup failed.');
}
