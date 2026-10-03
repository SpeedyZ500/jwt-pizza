import { test as base, expect } from 'playwright-test-coverage';
import type { BrowserContext } from '@playwright/test';
import { ApiMock } from './apiMock';

interface Violation {
  method: string;
  url: string;
  body: string | null;
}

export async function installRequestGuard(context: BrowserContext, frontendOrigin: string) {
  const violations: Violation[] = [];
  // Context interception also protects additional pages. API mocks use fallback
  // for unknown endpoints so they reach this guard instead of the network.
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/') || (url.origin !== frontendOrigin && request.resourceType() !== 'image')) {
      violations.push({ method: request.method(), url: url.href, body: request.postData() });
      await route.abort();
    } else if (url.origin !== frontendOrigin) {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' });
    } else {
      await route.continue();
    }
  });
  return violations;
}

const test = base.extend<{ api: ApiMock }>({
  page: async ({ page, context, baseURL }, use) => {
    const violations = await installRequestGuard(context, new URL(baseURL!).origin);
    await use(page);
    expect(violations, 'Unexpected unmocked backend or external request(s)').toEqual([]);
  },
  api: [async ({ page, context }, use) => {
    const api = new ApiMock();
    await api.install(context);
    await use(api);
  }, { auto: true }],
});

export { test, expect };
