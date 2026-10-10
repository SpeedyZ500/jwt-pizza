import { test, expect } from './testSetup';
import { users } from './apiMock';

test('franchisee creates a store and can cancel or confirm store closure', async ({ page, api }) => {
  await api.signedIn(page, users.franchisee);
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LotaPizza' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Lehi' })).toContainText('12 ₿');
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.matching('POST', '/api/franchise/2/store')).toHaveLength(0);
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('Provo');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Provo' })).toBeVisible();
  expect(api.matching('POST', '/api/franchise/2/store')[0].body).toEqual({ id: '', name: 'Provo' });
  const storeRow = page.getByRole('row').filter({ hasText: 'Provo' });
  await storeRow.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.matching('DELETE', '/api/franchise/2/store/20')).toHaveLength(0);
  await storeRow.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(storeRow).toHaveCount(0);
  expect(api.matching('DELETE', '/api/franchise/2/store/20')).toHaveLength(1);
});

test('visitor franchise page links to franchise login', async ({ page }) => {
  await page.goto('/franchise-dashboard');
  await expect(page.getByRole('heading', { name: 'So you want a piece of the pie?' })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: 'login', exact: true }).click();
  await expect(page).toHaveURL('/franchise-dashboard/login');
});
