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

test('admin dashboard paginates and filters franchises', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/');
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.locator('tbody')).toContainText(['LotaPizza', 'PizzaCorp', 'topSpot']);
  await expect(page.getByRole('button', { name: '«', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '»', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'LastSlice' })).toBeVisible();
  await expect(page.getByRole('button', { name: '»', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '«', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'LotaPizza' })).toBeVisible();
  await page.getByPlaceholder('Filter franchises').fill('PizzaCorp');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('tbody')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('PizzaCorp');
  expect(api.matching('GET', '/api/franchise').at(-1)?.query).toEqual({ page: '0', limit: '10', name: '*PizzaCorp*' });
});

test('admin creates a franchise and can cancel or confirm its closure', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.matching('POST', '/api/franchise')).toHaveLength(0);
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name', { exact: true }).fill('FreshPizza');
  await page.getByPlaceholder('franchisee admin email').fill('fresh@jwt.com');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL('/admin-dashboard');
  expect(api.matching('POST', '/api/franchise')[0].body).toEqual({ id: '', name: 'FreshPizza', stores: [], admins: [{ email: 'fresh@jwt.com' }] });
  const franchiseRow = page.getByRole('row').filter({ hasText: 'LotaPizza' });
  await franchiseRow.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.matching('DELETE', '/api/franchise/2')).toHaveLength(0);
  await franchiseRow.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL('/admin-dashboard');
  await expect(page.locator('tbody')).not.toContainText(['LotaPizza']);
  expect(api.matching('DELETE', '/api/franchise/2')).toHaveLength(1);
});

test('admin closes a store from its franchise listing', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  await page.getByRole('row').filter({ hasText: 'Lehi' }).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Lehi');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL('/admin-dashboard');
  await expect(page.getByRole('row').filter({ hasText: 'Lehi' })).toHaveCount(0);
  expect(api.matching('DELETE', '/api/franchise/2/store/4')).toHaveLength(1);
});

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
