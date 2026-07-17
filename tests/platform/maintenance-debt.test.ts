import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const projectRoot = process.cwd();

test('TD-017 removes the Sales Playbook route and navigation entry', () => {
  const routePath = resolve(projectRoot, 'app/admin/sales-playbook/page.tsx');
  const dashboardShell = readFileSync(resolve(projectRoot, 'components/DashboardShell.tsx'), 'utf8');
  const middleware = readFileSync(resolve(projectRoot, 'middleware.ts'), 'utf8');

  assert.equal(existsSync(routePath), false);
  assert.doesNotMatch(dashboardShell, /Sales Playbook|sales-playbook/);
  assert.doesNotMatch(middleware, /sales-playbook/);
});

test('TD-018 keeps the password toggle accessible and outside form submission', () => {
  const loginForm = readFileSync(resolve(projectRoot, 'app/login/LoginForm.tsx'), 'utf8');

  assert.match(loginForm, /type=\{passwordVisible \? 'text' : 'password'\}/);
  assert.match(loginForm, /type="button"/);
  assert.match(loginForm, /aria-label=\{passwordVisible \? 'Hide password' : 'Show password'\}/);
  assert.match(loginForm, /aria-controls="pilot-password"/);
  assert.match(loginForm, /aria-pressed=\{passwordVisible\}/);
  assert.match(loginForm, /autoComplete="current-password"/);
});
