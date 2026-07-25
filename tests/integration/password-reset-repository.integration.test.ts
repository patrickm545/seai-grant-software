import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPasswordResetRequestRepository } from '../../lib/password-reset-repository';
import type { PasswordResetTokenDigest } from '../../lib/password-reset-types';

const prisma = new PrismaClient();
const suffix = `password-reset-repository-${Date.now()}-${randomBytes(6).toString('hex')}`;
let userId: string;

function digest(label: string) {
  return `${label}-${randomBytes(32).toString('hex')}`.slice(0, 64) as PasswordResetTokenDigest;
}

before(async () => {
  await prisma.$connect();
  const user = await prisma.user.create({
    data: {
      email: `${suffix}@example.test`,
      displayName: 'Password Reset Repository Test',
      status: 'ACTIVE'
    }
  });
  userId = user.id;
});

after(async () => {
  await prisma.passwordResetRequest.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

test('concurrent PostgreSQL exchange attempts commit exactly one immutable exchange', async () => {
  const repository = new PrismaPasswordResetRequestRepository(prisma);
  const request = await prisma.passwordResetRequest.create({
    data: {
      userId,
      tokenDigest: digest('email'),
      status: 'DISPATCHED',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      dispatchedAt: new Date(),
      providerName: 'integration-test',
      providerReceiptId: 'opaque-integration-receipt'
    }
  });
  const attempts = [
    {
      id: request.id,
      exchangeDigest: digest('exchange-a'),
      exchangedAt: new Date()
    },
    {
      id: request.id,
      exchangeDigest: digest('exchange-b'),
      exchangedAt: new Date(Date.now() + 1)
    }
  ] as const;

  const results = await Promise.all(
    attempts.map((attempt) => repository.markExchanged(attempt))
  );
  assert.equal(results.filter((result) => result !== null).length, 1);
  assert.equal(results.filter((result) => result === null).length, 1);

  const successfulIndex = results.findIndex((result) => result !== null);
  assert.ok(successfulIndex >= 0);
  const stored = await prisma.passwordResetRequest.findUniqueOrThrow({
    where: { id: request.id }
  });
  assert.equal(stored.status, 'EXCHANGED');
  assert.equal(stored.exchangeDigest, attempts[successfulIndex].exchangeDigest);
  assert.equal(
    stored.exchangedAt?.toISOString(),
    attempts[successfulIndex].exchangedAt.toISOString()
  );

  const replay = await repository.markExchanged({
    id: request.id,
    exchangeDigest: digest('exchange-replay'),
    exchangedAt: new Date(Date.now() + 2)
  });
  assert.equal(replay, null);

  const afterReplay = await prisma.passwordResetRequest.findUniqueOrThrow({
    where: { id: request.id }
  });
  assert.equal(afterReplay.exchangeDigest, stored.exchangeDigest);
  assert.equal(afterReplay.exchangedAt?.toISOString(), stored.exchangedAt?.toISOString());
});
