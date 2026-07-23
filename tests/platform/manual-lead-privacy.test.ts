import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  getManualLeadPrivacyGateState,
  MANUAL_LEAD_PRIVACY_GATE_MESSAGE,
  ManualLeadPrivacyGateError
} from '../../lib/manual-lead-privacy';
import { isManualLeadIdempotencyUniqueTarget } from '../../lib/manual-lead';

test('manual lead privacy gate fails closed in Production and only exact true enables it', () => {
  for (const value of [undefined, 'false', 'TRUE', ' true ', '1', 'yes', 'enabled', 'arbitrary']) {
    assert.equal(getManualLeadPrivacyGateState({
      APP_ENV: 'production',
      MANUAL_LEAD_CREATION_ENABLED: value
    }).enabled, false);
  }

  assert.equal(getManualLeadPrivacyGateState({
    APP_ENV: 'production',
    MANUAL_LEAD_CREATION_ENABLED: 'true'
  }).enabled, true);
});

test('Preview, Development and test require the same explicit enablement', () => {
  for (const applicationEnvironment of ['preview', 'development', 'test']) {
    assert.equal(getManualLeadPrivacyGateState({
      APP_ENV: applicationEnvironment,
      MANUAL_LEAD_CREATION_ENABLED: undefined
    }).enabled, false);
    assert.equal(getManualLeadPrivacyGateState({
      APP_ENV: applicationEnvironment,
      MANUAL_LEAD_CREATION_ENABLED: 'true'
    }).enabled, true);
  }
});

test('missing, invalid and ambiguous application environments fail closed', () => {
  for (const applicationEnvironment of [undefined, '', 'staging', 'prod', 'unknown']) {
    assert.deepEqual(getManualLeadPrivacyGateState({
      APP_ENV: applicationEnvironment,
      MANUAL_LEAD_CREATION_ENABLED: 'true'
    }), {
      enabled: false,
      applicationEnvironment: null
    });
  }
});

test('privacy denial has a stable safe contract', () => {
  const error = new ManualLeadPrivacyGateError();
  assert.equal(error.code, 'MANUAL_LEAD_PRIVACY_GATE_CLOSED');
  assert.equal(error.message, MANUAL_LEAD_PRIVACY_GATE_MESSAGE);
  assert.doesNotMatch(error.message, /APP_ENV|MANUAL_LEAD_CREATION_ENABLED|configuration|flag/i);
});

test('every runtime manual-create entry point enforces or reflects the privacy gate', () => {
  const root = process.cwd();
  const service = readFileSync(join(root, 'lib', 'manual-lead.ts'), 'utf8');
  const action = readFileSync(join(root, 'app', 'installer-review-emerald', 'leads', 'new', 'actions.ts'), 'utf8');
  const page = readFileSync(join(root, 'app', 'installer-review-emerald', 'leads', 'new', 'page.tsx'), 'utf8');
  const list = readFileSync(join(root, 'app', 'installer-review-emerald', 'leads', 'page.tsx'), 'utf8');
  const workspaceLayout = readFileSync(join(root, 'app', 'installer-review-emerald', 'leads', '[id]', 'layout.tsx'), 'utf8');

  assert.ok(service.indexOf('requireManualLeadCreationEnabled();') < service.indexOf("requirePermission(context, 'lead.create')"));
  assert.ok(action.indexOf('if (!isManualLeadCreationEnabled())') < action.indexOf('readSafeValues(formData)'));
  assert.match(action, /message: MANUAL_LEAD_PRIVACY_GATE_MESSAGE/);
  assert.match(action, /error instanceof ManualLeadPrivacyGateError/);
  assert.match(page, /canCreate && privacyGateEnabled/);
  assert.match(page, /Manual Lead Creation unavailable/);
  assert.match(list, /hasPermission\(organisationContext, 'lead\.create'\) && isManualLeadCreationEnabled\(\)/);
  assert.match(workspaceLayout, /hasPermission\(context, 'lead\.create'\) && isManualLeadCreationEnabled\(\)/);
});

test('manual request unique violations are recognised only for the tenant-scoped key', () => {
  assert.equal(isManualLeadIdempotencyUniqueTarget(['organisationId', 'manualCreationRequestId']), true);
  assert.equal(isManualLeadIdempotencyUniqueTarget(['manualCreationRequestId', 'organisationId']), true);
  assert.equal(isManualLeadIdempotencyUniqueTarget('Lead_organisationId_manualCreationRequestId_key'), true);
  assert.equal(isManualLeadIdempotencyUniqueTarget(['portalToken']), false);
  assert.equal(isManualLeadIdempotencyUniqueTarget('Lead_portalToken_key'), false);
  assert.equal(isManualLeadIdempotencyUniqueTarget(['manualCreationRequestId']), false);
  assert.equal(isManualLeadIdempotencyUniqueTarget(undefined), false);
});
