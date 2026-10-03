import type { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { users, type ApiMock } from './apiMock';

export async function login(page: Page, user = users.diner) {
  await test.step(`Log in as ${user.name}`, async () => {
    await page.getByPlaceholder('Email address').fill(user.email);
    await page.getByPlaceholder('Password').fill(user.password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Logout', exact: true })).toBeVisible();
  });
}

export async function selectOrder(page: Page, titles = ['Veggie', 'Pepperoni']) {
  await test.step('Choose a store and pizzas', async () => {
    await page.goto('/menu');
    await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    await page.getByRole('combobox').selectOption('4');
    for (const title of titles) await page.getByRole('button', { name: new RegExp(title) }).click();
    await expect(page.getByText(`Selected pizzas: ${titles.length}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Checkout' }).click();
  });
}

export async function payAndDeliver(page: Page, api: ApiMock) {
  await api.signedIn(page);
  await selectOrder(page);
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
}
