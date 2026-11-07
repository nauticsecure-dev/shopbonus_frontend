import { expect, test } from '@playwright/test';

test('staging execution requires password confirmation and sends a fixed idempotent intent', async ({ page }) => {
  let intent: Record<string, unknown> | undefined;
  let passwordConfirmed = false;
  await page.addInitScript(() => localStorage.setItem('shopbonus-locale', 'en'));
  await page.route('**/user/confirm-password', route => { passwordConfirmed = true; return route.fulfill({ status: 204 }); });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/me') return route.fulfill({ json: { data: { id: 'qa1', first_name: 'QA', email: 'qa@example.test', email_verified: true, roles: ['qa_tester'], role: 'qa_tester', status: 'active', locale: 'en', workspaces: [] } } });
    if (path.endsWith('/executions') && route.request().method() === 'POST') {
      expect(passwordConfirmed).toBe(true);
      intent = route.request().postDataJSON();
      return route.fulfill({ status: 202, json: { data: { id: 'request1', status: 'queued', release_approved: false } } });
    }
    if (path.endsWith('/executions')) return route.fulfill({ json: { data: intent ? [{ id: 'request1', status: 'queued', deployment_sha: intent.deployment_sha, evidence_complete: false }] : [], meta: { last_page: 1 } } });
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/quality-center');
  await page.getByRole('button', { name: 'Execute staging', exact: true }).click();
  await page.getByLabel('Staging deployment SHA').fill('a'.repeat(40));
  await page.getByLabel('Execution suite').selectOption('after_deploy');
  await page.getByRole('button', { name: 'Review execution request' }).click();
  expect(intent).toBeUndefined();
  const dialog = page.getByRole('dialog', { name: 'Confirm staging execution' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Wachtwoord', { exact: true }).fill('synthetic-only-password');
  await dialog.getByRole('button', { name: 'Bevestigen', exact: true }).click();
  await expect.poll(() => intent?.deployment_sha).toBe('a'.repeat(40));
  expect(intent?.trigger).toBe('after_deploy');
  expect(intent?.request_key).toMatch(/^[a-f0-9-]{36}$/);
  await expect(page.getByRole('listitem').filter({ hasText: 'request1' })).toContainText('queued');
});

test('developer cannot see or request staging execution', async ({ page }) => {
  const privateCalls: string[] = [];
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/me') return route.fulfill({ json: { data: { id: 'dev1', first_name: 'Dev', email: 'dev@example.test', email_verified: true, roles: ['developer'], role: 'developer', status: 'active', locale: 'en', workspaces: [] } } });
    if (path.endsWith('/executions')) privateCalls.push(path);
    return route.fulfill({ json: { data: [], meta: { unread_count: 0 } } });
  });
  await page.goto('/quality-center');
  await expect(page.getByRole('button', { name: 'Findings', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Execute staging', exact: true })).toHaveCount(0);
  expect(privateCalls).toEqual([]);
});
