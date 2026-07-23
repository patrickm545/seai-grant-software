import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildManualLeadDuplicateSignals,
  formatManualLeadErrors,
  manualLeadSchema,
  normaliseEircode,
  normalisePhone
} from '../../lib/manual-lead';

const requestId = 'request_token_1234567890';

function parse(input: Record<string, unknown>) {
  return manualLeadSchema.safeParse({ requestId, ...input });
}

test('manual lead accepts name plus phone, email, or both', () => {
  assert.equal(parse({ fullName: 'Aoife Murphy', phone: '(087) 123 4567' }).success, true);
  assert.equal(parse({ fullName: 'Aoife Murphy', email: ' AOIFE@EXAMPLE.TEST ' }).success, true);
  assert.equal(parse({ fullName: 'Aoife Murphy', phone: '+353 87 123 4567', email: 'aoife@example.test' }).success, true);
});

test('manual lead rejects missing name, name-only and placeholder names', () => {
  assert.equal(parse({ fullName: '', phone: '0871234567' }).success, false);
  assert.equal(parse({ fullName: 'Aoife Murphy' }).success, false);
  assert.equal(parse({ fullName: 'Test', phone: '0871234567' }).success, false);
  assert.equal(parse({ fullName: 'Customer', email: 'customer@example.test' }).success, false);
});

test('manual lead normalises and validates contact details', () => {
  const result = parse({ fullName: 'Aoife Murphy', phone: '+353 (87) 123-4567', email: ' AOIFE@EXAMPLE.TEST ' });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.phone, '+353871234567');
  assert.equal(result.data.email, 'aoife@example.test');
  assert.equal(parse({ fullName: 'Aoife Murphy', email: 'not-an-email' }).success, false);
  assert.equal(parse({ fullName: 'Aoife Murphy', phone: '123' }).success, false);
  assert.equal(normalisePhone('087 123-4567'), '0871234567');
});

test('manual lead bounds inputs and accepts approved optional fields', () => {
  assert.equal(parse({ fullName: 'A'.repeat(121), phone: '0871234567' }).success, false);
  assert.equal(parse({ fullName: 'Aoife Murphy', phone: '0871234567', initialNote: 'x'.repeat(3001) }).success, false);
  const result = parse({
    fullName: 'Aoife Murphy',
    phone: '0871234567',
    addressLine1: '1 Main Street',
    eircode: 'd02 x285',
    leadSource: 'REFERRAL',
    followUpDate: '2026-08-01',
    assignedMembershipId: 'membership-a',
    initialNote: 'Call after lunch.'
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.eircode, 'D02 X285');
  assert.equal(parse({ fullName: 'Aoife Murphy', phone: '0871234567', leadSource: 'CUSTOM_VALUE' }).success, false);
});

test('duplicate signals are exact normalised values and never include name or address', () => {
  const result = parse({ fullName: 'Aoife Murphy', phone: '+353 87 123 4567', email: 'AOIFE@EXAMPLE.TEST', eircode: 'D02 X285' });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(buildManualLeadDuplicateSignals(result.data), [
    { normalisedEmail: 'aoife@example.test' },
    { normalisedPhone: '+353871234567' },
    { normalisedEircode: 'D02X285' }
  ]);
  assert.equal(normaliseEircode('d02 x285'), 'D02X285');
});

test('validation errors map to affected fields without echoing values', () => {
  const result = parse({ fullName: 'Test', email: 'bad' });
  assert.equal(result.success, false);
  if (result.success) return;
  const errors = formatManualLeadErrors(result.error);
  assert.ok(errors.fullName);
  assert.ok(errors.email);
  assert.doesNotMatch(JSON.stringify(errors), /bad/);
});

test('current application creation paths always write a non-legacy origin explicitly', () => {
  const publicIntake = readFileSync(join(process.cwd(), 'app', 'api', 'intake', 'route.ts'), 'utf8');
  const manualService = readFileSync(join(process.cwd(), 'lib', 'manual-lead.ts'), 'utf8');
  assert.match(publicIntake, /creationOrigin:\s*'HOMEOWNER_INTAKE'/);
  assert.match(manualService, /creationOrigin:\s*'MANUAL_INSTALLER'/);
  assert.doesNotMatch(`${publicIntake}\n${manualService}`, /creationOrigin:\s*'LEGACY_UNKNOWN'/);
});
