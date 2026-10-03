import { test, expect } from './testSetup';
import { login, selectOrder, payAndDeliver } from './helpers';

test('checkout preserves two pizzas through login and delivers the paid order', async ({ page, api }) => {
  await selectOrder(page);
  await expect(page).toHaveURL(/\/payment\/login$/);
  await login(page);
  await test.step('Check the bill and submit payment', async () => {
    await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
    await expect(page.locator('tbody')).toContainText('Veggie');
    await expect(page.locator('tbody')).toContainText('Pepperoni');
    await expect(page.locator('tfoot')).toContainText('0.008 ₿');
    await page.getByRole('button', { name: 'Pay now' }).click();
    await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText('23');
    await expect(page.getByRole('main')).toContainText('0.008');
    expect(api.matching('POST', '/api/order')[0].body).toEqual({
      franchiseId: '2', storeId: '4', items: [
        { menuId: '1', description: 'Veggie', price: 0.0038 },
        { menuId: '2', description: 'Pepperoni', price: 0.0042 },
      ],
    });
  });
});

test('payment failure displays the error and cancellation preserves the cart', async ({ page, api }) => {
  await api.signedIn(page);
  api.paymentError = true;
  await selectOrder(page, ['Veggie']);
  await expect(page.getByText('Send me that pizza right now!')).toBeVisible();
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText(/Payment declined/)).toBeVisible();
  await expect(page).toHaveURL('/payment');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Selected pizzas: 1')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveValue('4');
  expect(api.matching('POST', '/api/order')).toHaveLength(1);
});

test('delivery verifies the JWT and lets the diner order again', async ({ page, api }) => {
  await payAndDeliver(page, api);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeVisible();
  await expect(page.locator('#hs-jwt-modal')).toContainText('JWT Pizza - valid');
  await expect(page.locator('#hs-jwt-modal pre')).toContainText('23');
  expect(api.matching('POST', '/api/order/verify')[0].body).toEqual({ jwt: 'test-pizza-jwt' });
  // Preline marks the dialog opened after its initial animation starts.
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/\bopened\b/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeHidden();
  await page.getByRole('button', { name: 'Order more' }).click();
  await expect(page.getByRole('heading', { name: 'Awesome is a click away' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
});

for (const failure of ['invalid signature', 'network failure'] as const) {
  test(`delivery reports ${failure} when JWT verification fails`, async ({ page, api }) => {
    await payAndDeliver(page, api);
    api.verificationError = failure === 'invalid signature';
    api.verificationNetworkError = failure === 'network failure';
    await page.getByRole('button', { name: 'Verify', exact: true }).click();
    await expect(page.locator('#hs-jwt-modal')).toBeVisible();
    await expect(page.locator('#hs-jwt-modal pre')).toContainText('invalid JWT. Looks like you have a bad pizza!');
    expect(api.matching('POST', '/api/order/verify')).toHaveLength(1);
  });
}
