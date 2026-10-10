import { test, expect, installRequestGuard } from './testSetup';

test('the request guard aborts unmocked service, factory and same-origin API calls', async ({ browser, baseURL }) => {
  // An isolated context lets this test examine expected violations without
  // weakening the automatic zero-violation assertion for application tests.
  const context = await browser.newContext({ serviceWorkers: 'block' });
  try {
    const violations = await installRequestGuard(context, new URL(baseURL!).origin);
    const page = await context.newPage();
    await page.goto(baseURL!);
    const targets = [
      'http://localhost:3000/api/unmocked',
      'https://pizza-factory.cs329.click/api/unmocked',
      `${baseURL}/api/unmocked`,
      'https://unexpected-backend.example/api/unmocked',
    ];
    for (const url of targets) {
      const result = await page.evaluate(async (url) => {
        try { await fetch(url); return 'unexpected success'; }
        catch { return 'blocked'; }
      }, url);
      expect(result).toBe('blocked');
    }
    expect(violations.map(({ method, url }) => ({ method, url }))).toEqual(targets.map((url) => ({ method: 'GET', url })));
  } finally {
    await context.close();
  }
});

test('user mocks enforce admin authentication and omit passwords', async ({ page, api }) => {
  await page.goto('/');
  const request = (path: string, method = 'GET', authorized = true) => page.evaluate(async ({ path, method, authorized }) => {
    const response = await fetch(`http://localhost:3000${path}`, {
      method,
      headers: authorized ? { Authorization: 'Bearer test-token' } : {},
    });
    return { status: response.status, body: await response.json() };
  }, { path, method, authorized });
  expect((await request('/api/user')).status).toBe(401);
  expect((await request('/api/user/3', 'DELETE')).status).toBe(401);
  api.user = structuredClone(api.accounts.find((account) => account.id === '3')!);
  expect((await request('/api/user')).status).toBe(403);
  expect((await request('/api/user/3', 'DELETE')).status).toBe(403);
  api.user = structuredClone(api.accounts.find((account) => account.id === '1')!);
  expect((await request('/api/user', 'GET', false)).status).toBe(401);
  expect((await request('/api/user/3', 'DELETE', false)).status).toBe(401);
  const listing = await request('/api/user');
  expect(listing.status).toBe(200);
  expect(listing.body.more).toBe(false);
  expect(listing.body.users).toHaveLength(3);
  expect(listing.body.users.every((user: object) => !('password' in user))).toBe(true);
  expect((await request('/api/user?name=*a*a*')).body.users.map((user: { name: string }) => user.name)).toEqual(['Ada Admin']);
  expect((await request('/api/user?name=*.*')).body.users).toEqual([]);
  expect(await request('/api/user/3', 'DELETE')).toEqual({ status: 200, body: {} });
  expect((await request('/api/user')).body.users).toHaveLength(2);
  expect(api.accounts.some((account) => account.id === '3')).toBe(false);
  expect((await request('/api/user/3', 'DELETE')).status).toBe(404);
  const loginStatus = await page.evaluate(async () => {
    const response = await fetch('http://localhost:3000/api/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'd@jwt.com', password: 'a' }),
    });
    return response.status;
  });
  expect(loginStatus).toBe(401);
});
