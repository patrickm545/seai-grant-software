import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import { assertRehearsalSecretFree } from '../../lib/pilot-rehearsal';
import { cleanupSyntheticData, verifySyntheticCleanup } from '../../lib/pilot-rehearsal-cleanup';

test('complete disposable pilot rehearsal passes and leaves no secret-bearing report', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/pilot-rehearsal.ts', '--execute'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: 'test',
        DATABASE_ENVIRONMENT: 'test',
        AUTH_SESSION_PEPPER: 'pr31-integration-test-session-pepper-20260720'
      },
      encoding: 'utf8',
      timeout: 180_000
    }
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout) as {
    ok: boolean;
    rehearsal: { status: string; stagesPassed: number; stagesTotal: number; cleanupSucceeded: boolean; reportFiles: string[] };
  };
  assert.equal(output.ok, true);
  assert.equal(output.rehearsal.status, 'PASSED');
  assert.equal(output.rehearsal.stagesPassed, output.rehearsal.stagesTotal);
  assert.equal(output.rehearsal.cleanupSucceeded, true);
  for (const reportFile of output.rehearsal.reportFiles) {
    const content = readFileSync(join(process.cwd(), reportFile), 'utf8');
    assert.doesNotMatch(content, /passwordHash|sessionToken|tokenHash|postgresql:\/\/|\$argon2/i);
    if (reportFile.endsWith('.json')) {
      const report = JSON.parse(content);
      assertRehearsalSecretFree(report);
      assert.equal(report.status, 'PASSED');
      assert.equal(report.syntheticDataOnly, true);
      assert.equal(report.cleanupSucceeded, true);
      assert.equal(report.cleanup.verificationPassed, true);
      assert.equal(report.cleanup.remainingRecordCount, 0);
      assert.ok(report.cleanup.discoveredRecordCount >= report.cleanup.deletedRecordCount);
    }
  }
});

async function createUntrackedFixture(db: PrismaClient, rehearsalId: string) {
  const organisation = await db.organisation.create({
    data: {
      name: `Synthetic cleanup ${rehearsalId}`,
      slug: `cleanup-${rehearsalId}`,
      type: 'INSTALLER',
      status: 'PROVISIONING'
    }
  });
  const user = await db.user.create({
    data: {
      id: `cleanup-user-${rehearsalId}`,
      email: `cleanup-${rehearsalId}@pilot-rehearsal.example.test`,
      displayName: `Synthetic cleanup owner ${rehearsalId}`,
      status: 'ACTIVE',
      mustChangePassword: false
    }
  });
  const membership = await db.organisationMembership.create({
    data: {
      organisationId: organisation.id,
      userId: user.id,
      status: 'ACTIVE',
      role: 'ORGANISATION_ADMIN',
      isOwner: true
    }
  });
  const installer = await db.installer.create({
    data: {
      organisationId: organisation.id,
      name: `Synthetic cleanup installer ${rehearsalId}`,
      slug: `cleanup-installer-${rehearsalId}`,
      seaiCompanyId: `CLEANUP-${rehearsalId}`
    }
  });
  const lead = await db.lead.create({
    data: {
      organisationId: organisation.id,
      installerId: installer.id,
      creationOrigin: 'HOMEOWNER_INTAKE',
      fullName: `Synthetic cleanup lead ${rehearsalId}`,
      email: `lead-${rehearsalId}@pilot-rehearsal.example.test`,
      phone: '+353000000000',
      addressLine1: 'Synthetic cleanup address',
      county: 'Synthetic County',
      propertyOwner: true,
      dwellingType: 'DETACHED',
      yearBuilt: 2020,
      mprn: `888888888${rehearsalId.length}`,
      worksStarted: false,
      consentToProcess: true,
      consentToGrantAssist: true,
      consentToContact: true
    }
  });
  const activity = await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: 'SYSTEM_EVENT',
      title: `Synthetic cleanup activity ${rehearsalId}`
    }
  });
  const session = await db.authSession.create({
    data: {
      userId: user.id,
      tokenHash: `cleanup-session-${rehearsalId}`,
      sessionType: 'NORMAL',
      expiresAt: new Date(Date.now() + 60_000)
    }
  });
  const operation = await db.provisioningOperation.create({
    data: {
      idempotencyKey: `cleanup-operation-${rehearsalId}`,
      inputHash: `cleanup-input-${rehearsalId}`,
      operationType: 'RECOVERY_SUSPEND_USER',
      status: 'PENDING',
      organisationId: organisation.id,
      approvedBy: user.id,
      approvedAt: new Date()
    }
  });
  const audit = await db.auditLog.create({
    data: {
      action: 'RECOVERY_INSPECTION_PERFORMED',
      actor: 'Synthetic cleanup test',
      actorType: 'HUMAN_USER',
      userId: user.id,
      membershipId: membership.id,
      organisationId: organisation.id,
      leadId: lead.id,
      provisioningOperationId: operation.id,
      source: `pilot-rehearsal:${rehearsalId}`,
      metadataJson: { reasonCode: 'SYNTHETIC_CLEANUP_TEST' }
    }
  });
  return { organisation, user, membership, installer, lead, activity, session, operation, audit };
}

test('discovery cleanup removes untracked rows, is idempotent, isolated, and verifies retention', async () => {
  const db = new PrismaClient();
  const rehearsalA = `pilot-rehearsal-cleanup-a-${Date.now()}`;
  const rehearsalB = `pilot-rehearsal-cleanup-b-${Date.now()}`;
  const unrelated = await db.organisation.create({
    data: {
      name: 'Synthetic unrelated cleanup control',
      slug: `cleanup-unrelated-${Date.now()}`,
      type: 'INSTALLER',
      status: 'PROVISIONING'
    }
  });
  try {
    const fixtureA = await createUntrackedFixture(db, rehearsalA);
    const fixtureB = await createUntrackedFixture(db, rehearsalB);

    const cleanedA = await cleanupSyntheticData(db, rehearsalA);
    assert.equal(cleanedA.verificationPassed, true);
    assert.ok(cleanedA.discoveredRecordCount > 0);
    assert.equal(cleanedA.remainingRecordCount, 0);
    assert.equal(await db.organisation.count({ where: { id: fixtureA.organisation.id } }), 0);
    assert.equal(await db.user.count({ where: { id: fixtureA.user.id } }), 0);
    assert.equal(await db.lead.count({ where: { id: fixtureA.lead.id } }), 0);
    assert.equal(await db.leadActivity.count({ where: { id: fixtureA.activity.id } }), 0);
    assert.equal(await db.organisation.count({ where: { id: fixtureB.organisation.id } }), 1);
    assert.equal(await db.organisation.count({ where: { id: unrelated.id } }), 1);

    const secondA = await cleanupSyntheticData(db, rehearsalA);
    assert.equal(secondA.verificationPassed, true);
    assert.equal(secondA.discoveredRecordCount, 0);
    assert.equal(secondA.deletedRecordCount, 0);

    const retained = await db.organisation.create({
      data: {
        name: `Synthetic retained ${rehearsalA}`,
        slug: `cleanup-retained-${rehearsalA}`,
        type: 'INSTALLER',
        status: 'PROVISIONING'
      }
    });
    const beforeCleanup = await verifySyntheticCleanup(db, rehearsalA);
    assert.equal(beforeCleanup.verificationPassed, false);
    assert.ok(beforeCleanup.remainingRecordCount > 0);
    const cleanedRetained = await cleanupSyntheticData(db, rehearsalA);
    assert.equal(cleanedRetained.verificationPassed, true);
    assert.equal(await db.organisation.count({ where: { id: retained.id } }), 0);

    const cleanedB = await cleanupSyntheticData(db, rehearsalB);
    assert.equal(cleanedB.verificationPassed, true);
    assert.equal(await db.organisation.count({ where: { id: fixtureB.organisation.id } }), 0);
    assert.equal(await db.organisation.count({ where: { id: unrelated.id } }), 1);
  } finally {
    await db.organisation.deleteMany({ where: { id: unrelated.id } }).catch(() => undefined);
    await db.$disconnect();
  }
});
