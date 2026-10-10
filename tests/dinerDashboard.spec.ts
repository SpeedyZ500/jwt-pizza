import { test, expect } from './testSetup';
import { users } from './apiMock';

test('diner profile shows account details and the empty history prompt', async ({ page, api }) => {
  await api.signedIn(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'KC', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('main')).toContainText('d@jwt.com');
  await expect(page.getByRole('main')).toContainText('diner');
  await expect(page.getByText(/How have you lived this long/)).toBeVisible();
  expect(api.matching('GET', '/api/order')).toHaveLength(1);
});

test('diner history shows order IDs, totals, dates and franchisee roles', async ({ page, api }) => {
  api.orders = [{ id: '42', franchiseId: '2', storeId: '4', date: '2026-10-03', items: [{ menuId: '1', description: 'Veggie', price: 0.0038 }] }];
  await api.signedIn(page, users.franchisee);
  await page.goto('/');
  await page.getByRole('link', { name: 'FO', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Franchisee on 2');
  await expect(page.locator('tbody')).toContainText('42');
  await expect(page.locator('tbody')).toContainText('0.004');
  await expect(page.locator('tbody')).toContainText('2026-10-03');
});
