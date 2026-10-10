import { test, expect } from "./testSetup";

test("updateUser", async ({ page, api }) => {
    const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
    await page.goto("/");
    await page.getByRole("link", { name: "Register" }).click();
    await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
    await page.getByRole("textbox", { name: "Email address" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill("diner");
    await page.getByRole("button", { name: "Register" }).click();

    await page.getByRole("link", { name: "pd" }).click();

    await expect(page.getByRole("main")).toContainText("pizza diner");
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h3")).toContainText("Edit user");
    await page.getByRole("button", { name: "Update" }).click();

    await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

    expect(api.matching('PUT', '/api/user/9')).toHaveLength(1);
    expect(api.matching('PUT', '/api/user/9')[0].body).toEqual({
        id: '9', name: 'pizza diner', email, roles: [{ role: 'diner' }],
    });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('test-token');
    await expect(page.getByRole("main")).toContainText("pizza diner");
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("h3")).toContainText("Edit user");
    await page.getByRole("textbox").first().fill("pizza dinerx");
    await page.getByRole("button", { name: "Update" }).click();

    await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

    await expect(page.getByRole("main")).toContainText("pizza dinerx");
    expect(api.matching('PUT', '/api/user/9')).toHaveLength(2);
    expect(api.matching('PUT', '/api/user/9')[1].body).toEqual({
        id: '9', name: 'pizza dinerx', email, roles: [{ role: 'diner' }],
    });
    expect(api.user).not.toHaveProperty('password');
    await page.getByRole('link', { name: 'Logout' }).click();
    await page.getByRole('link', { name: 'Login' }).click();

    await page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('diner');
    await page.getByRole('button', { name: 'Login' }).click();

    await page.getByRole('link', { name: 'pd' }).click();

    await expect(page.getByRole('main')).toContainText('pizza dinerx');
});
