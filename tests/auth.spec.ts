import { test, expect } from './testSetup';
import { users } from './apiMock';
import { login } from './helpers';

test('login stores the token and logout clears the session', async ({ page, api }) => {
  await page.goto('/login');
  await expect(page.getByPlaceholder('Email address')).toBeFocused();
  await login(page);
  await expect(page.getByRole('link', { name: 'KC', exact: true })).toBeVisible();
  expect(api.matching('PUT', '/api/auth')[0].body).toEqual({ email: users.diner.email, password: 'a' });
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('test-token');
  await page.getByRole('link', { name: 'Logout', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  await expect.poll(() => api.matching('DELETE', '/api/auth').length).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});

test('invalid login displays the server message and stays logged out', async ({ page, api }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(users.diner.email);
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText(/Unauthorized/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  expect(api.matching('PUT', '/api/auth')).toHaveLength(1);
});

test('registration creates a diner account and logs in', async ({ page, api }) => {
  await page.goto('/login');
  await page.getByText('Register', { exact: true }).last().click();
  await expect(page.getByPlaceholder('Full name')).toBeFocused();
  await page.getByPlaceholder('Full name').fill('New Diner');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('secret');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('link', { name: 'ND', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/');
  expect(api.matching('POST', '/api/auth')[0].body).toEqual({ name: 'New Diner', email: 'new@jwt.com', password: 'secret' });
});

test('duplicate registration displays the error and allows returning to login', async ({ page, api }) => {
  api.registrationError = true;
  await page.goto('/register');
  await page.getByPlaceholder('Full name').fill('Kai Chen');
  await page.getByPlaceholder('Email address').fill(users.diner.email);
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByText(/Email already registered/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  await page.getByText('Login', { exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('a saved session restores the signed-in user', async ({ page, api }) => {
  await api.signedIn(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'KC', exact: true })).toBeVisible();
  expect(api.matching('GET', '/api/user/me')[0].authorization).toBe('Bearer test-token');
});

test('an expired session removes the stale token', async ({ page, api }) => {
  await api.signedIn(page);
  api.sessionExpired = true;
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  expect(api.matching('GET', '/api/user/me')).toHaveLength(1);
});
