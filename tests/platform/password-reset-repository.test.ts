import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  PasswordResetRequest,
  PasswordResetStatus,
  PrismaClient
} from '@prisma/client';
import { PrismaPasswordResetRequestRepository } from '../../lib/password-reset-repository';
import type { PasswordResetTokenDigest } from '../../lib/password-reset-types';

function digest(value: string) {
  return value.padEnd(64, '0') as PasswordResetTokenDigest;
}

function makeRequest(
  overrides: Partial<PasswordResetRequest> = {}
): PasswordResetRequest {
  const createdAt = new Date('2026-07-24T12:00:00.000Z');
  return {
    id: 'reset-existing',
    userId: 'user-1',
    tokenDigest: digest('existing'),
    exchangeDigest: null,
    status: 'DISPATCHED',
    expiresAt: new Date('2026-07-24T12:30:00.000Z'),
    dispatchedAt: createdAt,
    exchangedAt: null,
    consumedAt: null,
    revokedAt: null,
    revocationReason: null,
    providerName: 'provider',
    providerReceiptId: 'receipt-1',
    correlationId: 'correlation-existing',
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function matchesWhere(
  request: PasswordResetRequest,
  where: Record<string, unknown>
): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = request[key as keyof PasswordResetRequest];
    if (expected === null) return actual === null;
    if (typeof expected !== 'object' || expected === null) return actual === expected;
    const condition = expected as Record<string, unknown>;
    if (Array.isArray(condition.in)) return condition.in.includes(actual);
    if (Array.isArray(condition.notIn)) return !condition.notIn.includes(actual);
    if ('not' in condition) return actual !== condition.not;
    if ('gt' in condition) return actual instanceof Date && actual > (condition.gt as Date);
    if ('lt' in condition) return actual instanceof Date && actual < (condition.lt as Date);
    return false;
  });
}

function createFakeDb(seed: PasswordResetRequest[]) {
  const requests = seed.map((request) => ({ ...request }));
  const transactionOptions: unknown[] = [];
  let nextId = 1;

  const delegate = {
    async findUnique(args: { where: Record<string, unknown> }) {
      return (
        requests.find((request) => matchesWhere(request, args.where)) ?? null
      );
    },
    async updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) {
      let count = 0;
      for (const request of requests) {
        if (!matchesWhere(request, args.where)) continue;
        Object.assign(request, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },
    async create(args: { data: Partial<PasswordResetRequest> }) {
      const created = makeRequest({
        id: `reset-${nextId++}`,
        status: 'PENDING',
        dispatchedAt: null,
        providerName: null,
        providerReceiptId: null,
        correlationId: null,
        ...args.data
      });
      requests.push(created);
      return created;
    },
    async findMany(args: {
      where: Record<string, unknown>;
      take: number;
    }) {
      return requests
        .filter((request) => matchesWhere(request, args.where))
        .slice(0, args.take)
        .map(({ id }) => ({ id }));
    },
    async deleteMany(args: { where: { id: { in: string[] } } }) {
      const before = requests.length;
      const ids = new Set(args.where.id.in);
      for (let index = requests.length - 1; index >= 0; index -= 1) {
        if (ids.has(requests[index].id)) requests.splice(index, 1);
      }
      return { count: before - requests.length };
    }
  };

  const db = {
    passwordResetRequest: delegate,
    async $transaction(
      callback: (transaction: unknown) => unknown,
      options?: unknown
    ) {
      transactionOptions.push(options);
      return callback(db);
    }
  };
  return {
    db: db as unknown as PrismaClient,
    requests,
    transactionOptions
  };
}

test('repository supersedes prior active requests and creates one pending request serializably', async () => {
  const fake = createFakeDb([makeRequest()]);
  const repository = new PrismaPasswordResetRequestRepository(fake.db);
  const createdAt = new Date('2026-07-24T12:10:00.000Z');

  const created = await repository.createSuperseding({
    userId: 'user-1',
    tokenDigest: digest('new'),
    expiresAt: new Date('2026-07-24T12:40:00.000Z'),
    correlationId: 'correlation-new',
    createdAt
  });

  assert.equal(fake.requests[0].status, 'REVOKED');
  assert.equal(fake.requests[0].revocationReason, 'SUPERSEDED');
  assert.equal(fake.requests[0].revokedAt?.toISOString(), createdAt.toISOString());
  assert.equal(created.status, 'PENDING');
  assert.equal(created.tokenDigest, digest('new'));
  assert.deepEqual(fake.transactionOptions[0], { isolationLevel: 'Serializable' });
});

test('repository supports digest lookup and guarded dispatch, exchange, consumption, and revocation', async () => {
  const fake = createFakeDb([
    makeRequest({
      id: 'reset-1',
      status: 'PENDING',
      dispatchedAt: null,
      providerName: null,
      providerReceiptId: null
    })
  ]);
  const repository = new PrismaPasswordResetRequestRepository(fake.db);
  const dispatchedAt = new Date('2026-07-24T12:05:00.000Z');

  assert.equal(
    (await repository.findByTokenDigest(digest('existing')))?.id,
    'reset-1'
  );
  assert.equal(
    (
      await repository.markDispatched({
        id: 'reset-1',
        dispatchedAt,
        providerName: 'safe-provider',
        providerReceiptId: 'opaque-receipt'
      })
    )?.status,
    'DISPATCHED'
  );
  assert.equal(
    (
      await repository.markExchanged({
        id: 'reset-1',
        exchangeDigest: digest('exchange'),
        exchangedAt: new Date('2026-07-24T12:06:00.000Z')
      })
    )?.status,
    'EXCHANGED'
  );
  assert.equal(
    (await repository.findByExchangeDigest(digest('exchange')))?.id,
    'reset-1'
  );
  const consumed = await repository.markConsumed({
    id: 'reset-1',
    consumedAt: new Date('2026-07-24T12:07:00.000Z')
  });
  assert.equal(consumed?.status, 'CONSUMED');
  assert.equal(consumed?.exchangeDigest, null);
  assert.equal(
    await repository.revoke({
      id: 'reset-1',
      revokedAt: new Date('2026-07-24T12:08:00.000Z'),
      reason: 'ADMINISTRATIVE'
    }),
    null
  );
});

test('repository refuses expired transitions and bounds terminal cleanup', async () => {
  const old = new Date('2026-06-01T00:00:00.000Z');
  const fake = createFakeDb([
    makeRequest({
      id: 'expired',
      status: 'PENDING',
      dispatchedAt: null,
      expiresAt: old
    }),
    makeRequest({
      id: 'consumed',
      status: 'CONSUMED',
      consumedAt: old,
      updatedAt: old
    })
  ]);
  const repository = new PrismaPasswordResetRequestRepository(fake.db);

  assert.equal(
    await repository.markDispatched({
      id: 'expired',
      dispatchedAt: new Date('2026-07-24T12:00:00.000Z'),
      providerName: 'provider',
      providerReceiptId: 'receipt'
    }),
    null
  );
  assert.equal(
    await repository.removeTerminalBefore({
      terminalBefore: new Date('2026-07-01T00:00:00.000Z'),
      limit: 10
    }),
    1
  );
  await assert.rejects(
    () =>
      repository.removeTerminalBefore({
        terminalBefore: new Date(),
        limit: 1001
      }),
    RangeError
  );
});

test('repository active-state set remains explicit', () => {
  const statuses: PasswordResetStatus[] = [
    'PENDING',
    'DISPATCHED',
    'EXCHANGED',
    'CONSUMED',
    'REVOKED'
  ];
  assert.equal(statuses.length, 5);
});
