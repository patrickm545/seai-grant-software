import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditStatusSummary
} from '../../lib/audit-presentation';
import {
  buildSubmissionPackageDownload,
  SUBMISSION_PACKAGE_FILENAME
} from '../../lib/submission-package-download';

const root = process.cwd();
const page = readFileSync(resolve(root, 'app/installer-review-emerald/leads/[id]/page.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
const route = readFileSync(resolve(root, 'app/api/submission-package/route.ts'), 'utf8');

test('installer lead details never renders raw application or audit metadata', () => {
  assert.doesNotMatch(page, /View raw data/i);
  assert.doesNotMatch(page, /View audit metadata/i);
  assert.doesNotMatch(page, /JSON\.stringify\(entry\.metadataJson/);
  assert.doesNotMatch(page, /rawExportJson/);
  assert.match(page, /Readable application and quote summary for installer review/);
});

test('audit presentation uses safe plain-English labels and allowlisted status changes', () => {
  assert.equal(getAuditActionLabel('lead.pipeline_stage_updated'), 'Pipeline stage updated');
  assert.equal(getAuditActorLabel('admin'), 'Installer team');
  assert.equal(getAuditActorLabel('user_cuid_internal'), 'Team member');
  assert.equal(
    getAuditStatusSummary({
      previousStage: 'CONTACTED',
      nextStage: 'QUALIFIED',
      organisationId: 'org-internal',
      installerId: 'installer-internal'
    }),
    'Contacted to Qualified'
  );
  assert.equal(getAuditStatusSummary({ nextStatus: 'INTERNAL_UNKNOWN_ENUM' }), null);
});

test('structured JSON export is a safe, descriptive attachment', async () => {
  const response = buildSubmissionPackageDownload({ approved: true });
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(
    response.headers.get('content-disposition'),
    `attachment; filename="${SUBMISSION_PACKAGE_FILENAME}"`
  );
  assert.match(SUBMISSION_PACKAGE_FILENAME, /^solargrant-application-pack[a-z0-9.-]*\.json$/);
  assert.equal(await response.text(), '{\n  "approved": true\n}');
  assert.match(page, /Download structured JSON/);
  assert.match(page, /href=\{`\/api\/submission-package\?id=\$\{lead\.id\}`\} download/);
});

test('export route retains authentication and organisation scoping and fails closed', () => {
  assert.match(route, /requirePilotContext\(\)/);
  assert.match(route, /leadOrganisationWhere\(organisationContext, \{ id \}\)/);
  assert.match(route, /if \(!lead\).*Lead not found.*status: 404/);
  assert.match(route, /PASSWORD_CHANGE_REQUIRED/);
  assert.match(route, /status: 403/);
  assert.match(route, /status: 401/);
  assert.match(route, /buildSubmissionPackageDownload\(payload\)/);
});

test('CRM pipeline remains in its grid column without sticky positioning at any breakpoint', () => {
  assert.doesNotMatch(page, /lead-crm-sticky-card/);
  assert.doesNotMatch(css, /\.lead-crm-sticky-card/);
  assert.match(css, /\.lead-crm-layout\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) minmax\(320px, 390px\)/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*\.lead-crm-layout\s*\{\s*grid-template-columns: 1fr/);
});
