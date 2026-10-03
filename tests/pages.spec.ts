import { test, expect } from './testSetup';

for (const [path, heading] of [['/about', 'The secret sauce'], ['/history', 'Mama Rucci, my my'], ['/missing-page', 'Oops']] as const) {
  test(`${path} renders its page content`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  });
}

for (const source of ['service', 'factory']) {
  test(`${source} documentation renders endpoint examples and responses`, async ({ page, api }) => {
    await page.goto(`/docs/${source}`);
    await expect(page.getByRole('heading', { name: 'JWT Pizza API', exact: true })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(`${source} order endpoint`);
    await expect(page.getByRole('main')).toContainText('Example pizza request');
    await expect(page.locator('pre')).toContainText('"accepted": true');
    expect(api.matching('GET', '/api/docs')).toHaveLength(1);
  });
}
