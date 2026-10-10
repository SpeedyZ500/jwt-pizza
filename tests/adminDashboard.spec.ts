import { test, expect } from './testSetup';
import { users } from './apiMock';

test('admin dashboard paginates and filters franchises', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/');
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).locator('tbody')).toContainText(['LotaPizza', 'PizzaCorp', 'topSpot']);
  await expect(page.getByRole('button', { name: '«', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '»', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).getByRole('row').filter({ hasText: 'LastSlice' })).toBeVisible();
  await expect(page.getByRole('button', { name: '»', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '«', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).getByRole('row').filter({ hasText: 'LotaPizza' })).toBeVisible();
  await page.getByPlaceholder('Filter franchises').fill('PizzaCorp');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).locator('tbody')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).locator('tbody')).toContainText('PizzaCorp');
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
  const franchiseRow = page.getByRole('region', { name: 'Franchises', exact: true }).getByRole('row').filter({ hasText: 'LotaPizza' });
  await franchiseRow.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('LotaPizza');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(api.matching('DELETE', '/api/franchise/2')).toHaveLength(0);
  await franchiseRow.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL('/admin-dashboard');
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).locator('tbody')).not.toContainText(['LotaPizza']);
  expect(api.matching('DELETE', '/api/franchise/2')).toHaveLength(1);
});

test('admin closes a store from its franchise listing', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  await page.getByRole('region', { name: 'Franchises', exact: true }).getByRole('row').filter({ hasText: 'Lehi' }).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Lehi');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page).toHaveURL('/admin-dashboard');
  await expect(page.getByRole('region', { name: 'Franchises', exact: true }).getByRole('row').filter({ hasText: 'Lehi' })).toHaveCount(0);
  expect(api.matching('DELETE', '/api/franchise/2/store/4')).toHaveLength(1);
});

test('admin dashboard paginates and filters users', async ({ page, api }) => {
  api.accounts.push(...Array.from({ length: 11 }, (_, i) => ({ ...users.diner, id: String(30 + i), name: `Guest ${i}`, email: `guest${i}@jwt.com` })));
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  const section = page.getByRole('region', { name: 'Users', exact: true });
  await expect(section.getByRole('columnheader')).toHaveText(['Name', 'Email', 'Role', '']);
  await expect(section.locator('tbody tr')).toHaveCount(10);
  await expect(section.getByRole('row').filter({ hasText: 'Ada Admin' })).toContainText('admin@jwt.com');
  await expect(section.getByRole('row').filter({ hasText: 'Fran Owner' })).toContainText('diner, franchisee');
  await expect(section.getByRole('button', { name: 'Prev', exact: true })).toBeDisabled();
  await section.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(4);
  await expect(section.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await section.getByPlaceholder('Name', { exact: true }).fill('gUeSt');
  await section.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(10);
  expect(api.matching('GET', '/api/user').at(-1)?.query).toEqual({ page: '0', limit: '10', name: '*gUeSt*' });
  await section.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(1);
  expect(api.matching('GET', '/api/user').at(-1)?.query).toEqual({ page: '1', limit: '10', name: '*gUeSt*' });
  await section.getByRole('button', { name: 'Prev', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(10);
  await section.getByPlaceholder('Name', { exact: true }).fill('Missing');
  await section.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(0);
  await expect(section.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  expect(api.matching('GET', '/api/user').every((request) => request.authorization === 'Bearer test-token')).toBe(true);
});

test('admin confirms or cancels user deletion', async ({ page, api }) => {
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  const section = page.getByRole('region', { name: 'Users', exact: true });
  const row = section.getByRole('row').filter({ hasText: 'Kai Chen' });
  await row.getByRole('button', { name: 'X', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Kai Chen');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(api.matching('DELETE', '/api/user/3')).toHaveLength(0);
  await row.getByRole('button', { name: 'X', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(section.locator('tbody tr')).toContainText(['Ada Admin', 'Fran Owner']);
  expect(api.matching('DELETE', '/api/user/3')).toHaveLength(1);
  expect(api.matching('DELETE', '/api/user/3')[0].authorization).toBe('Bearer test-token');
});

test('admin deletion returns from an empty final user page', async ({ page, api }) => {
  api.accounts.push(...Array.from({ length: 8 }, (_, i) => ({ ...users.diner, id: String(30 + i), name: `Guest ${i}` })));
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  const section = page.getByRole('region', { name: 'Users', exact: true });
  await section.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(1);
  await section.getByRole('button', { name: 'X', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(section.locator('tbody tr')).toHaveCount(10);
  await expect(section.getByRole('button', { name: 'Prev', exact: true })).toBeDisabled();
});

test('admin sees deletion errors without losing the user row', async ({ page, api }) => {
  api.deletionError = true;
  await api.signedIn(page, users.admin);
  await page.goto('/admin-dashboard');
  const row = page.getByRole('region', { name: 'Users', exact: true }).getByRole('row').filter({ hasText: 'Kai Chen' });
  await row.getByRole('button', { name: 'X', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to delete user');
  await expect(row).toBeVisible();
});
