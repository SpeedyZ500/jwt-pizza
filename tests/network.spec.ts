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
