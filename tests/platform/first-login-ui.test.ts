import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const form = readFileSync(resolve(process.cwd(), 'app/first-login/password/FirstLoginForm.tsx'), 'utf8');
const firstLoginPage = readFileSync(resolve(process.cwd(), 'app/first-login/password/page.tsx'), 'utf8');
const firstLoginAction = readFileSync(resolve(process.cwd(), 'app/first-login/password/actions.ts'), 'utf8');
const adminLayout = readFileSync(resolve(process.cwd(), 'app/admin/layout.tsx'), 'utf8');
const installerLayout = readFileSync(resolve(process.cwd(), 'app/installer-review-emerald/layout.tsx'), 'utf8');
const middleware = readFileSync(resolve(process.cwd(), 'middleware.ts'), 'utf8');
const protectedApis = [
  'app/api/leads/[id]/route.ts',
  'app/api/submission-package/route.ts',
  'app/api/portal-fill-preview/route.ts'
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'));

test('first-login form is labelled and supplies password-manager and error semantics', () => {
  assert.match(form, /htmlFor="current-credential"/);
  assert.match(form, /autoComplete="current-password"/);
  assert.equal((form.match(/autoComplete="new-password"/g) ?? []).length, 2);
  assert.match(form, /aria-describedby="password-requirements"/);
  assert.match(form, /role="alert"/);
  assert.match(form, /minLength=\{12\}/);
  assert.match(form, /maxLength=\{128\}/);
  assert.equal((form.match(/aria-pressed=/g) ?? []).length, 3);
  assert.equal((form.match(/type="button"/g) ?? []).length, 3);
});

test('normal HTML surfaces redirect restricted users to first login', () => {
  assert.match(adminLayout, /RESTRICTED_FIRST_LOGIN/);
  assert.match(adminLayout, /redirect\('\/first-login\/password'\)/);
  assert.match(installerLayout, /RESTRICTED_FIRST_LOGIN/);
  assert.match(installerLayout, /redirect\('\/first-login\/password'\)/);
});

test('first-login page and action are restricted to the server-validated session', () => {
  assert.match(firstLoginPage, /getCurrentPilotSessionState/);
  assert.match(firstLoginPage, /if \(!session\) redirect\('\/login'\)/);
  assert.match(firstLoginPage, /session\.kind === 'NORMAL'/);
  assert.match(firstLoginPage, /action="\/logout" method="post"/);
  assert.match(firstLoginAction, /completePilotFirstLogin/);
  assert.match(firstLoginAction, /PILOT_SESSION_COOKIE_NAME/);
  assert.match(firstLoginAction, /redirect\(`\/first-login\/password\?error=/);
});

test('middleware challenges unauthenticated access to the first-login route', () => {
  assert.match(middleware, /pathname\.startsWith\('\/first-login\/password'\)/);
  assert.match(middleware, /'\/first-login\/password'/);
  assert.match(middleware, /url\.pathname = '\/login'/);
});

test('protected APIs refuse restricted sessions without returning tenant data', () => {
  for (const route of protectedApis) {
    assert.match(route, /PASSWORD_CHANGE_REQUIRED/);
    assert.match(route, /status: 403/);
  }
});
