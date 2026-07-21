import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const form = readFileSync(resolve(root, 'components/LeadForm.tsx'), 'utf8');
const styles = readFileSync(resolve(root, 'app/globals.css'), 'utf8');
const ai = readFileSync(resolve(root, 'lib/ai.ts'), 'utf8');

test('public intake groups all counties and renders the approved unsupported route', () => {
  assert.match(form, /solarGrantCountyGroups\.map/);
  assert.match(form, /<optgroup key=\{group\.label\} label=\{group\.label\}>/);
  assert.match(form, /Property in Northern Ireland/);
  assert.match(form, /SOLARGRANT_UNSUPPORTED_MESSAGE/);
  assert.match(form, />\s*Change county\s*</);
  assert.match(form, /update\('county', ''\)/);
});

test('unsupported and restored drafts are classified before previews can run', () => {
  assert.match(form, /restoredJurisdiction\.isSupported \? normalizeDraftStep\(parsed\.currentStep\) : 0/);
  assert.match(form, /jurisdiction\.isSupported \? buildSolarQuoteEstimate/);
  assert.match(form, /if \(!estimate\) return null/);
  assert.match(form, /!isUnsupportedJurisdiction \? <div className="step-actions">/);
});

test('unsupported and conflicting states preserve accessible focus and mobile containment', () => {
  assert.match(form, /aria-live="assertive"/);
  assert.match(form, /tabIndex=\{-1\}/);
  assert.match(form, /jurisdictionMessageRef\.current\?\.focus/);
  assert.match(form, /SOLARGRANT_CONFLICT_MESSAGE/);
  assert.match(styles, /\.jurisdiction-route-panel/);
  assert.match(styles, /overflow-wrap: anywhere/);
  assert.match(styles, /@media \(max-width: 480px\)/);
});

test('optional AI is downstream of the deterministic jurisdiction-guarded fallback', () => {
  assert.ok(ai.indexOf('runRulesBasedEligibility(input)') < ai.indexOf('if (!openai)'));
  assert.ok(ai.indexOf('runRulesBasedEligibility(input)') < ai.indexOf('openai.responses.create'));
});
