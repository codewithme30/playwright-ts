import { test, expect } from '@playwright/test';

/**
 * Sample browser/UI tests against two real, publicly reachable demo applications:
 *  - https://www.saucedemo.com — Sauce Labs' standing e-commerce demo for test automation.
 *  - https://playwright.dev — Playwright's own documentation site.
 */
const SAUCE_DEMO_URL = 'https://www.saucedemo.com';

async function loginAsStandardUser(page: import('@playwright/test').Page) {
  await page.goto(SAUCE_DEMO_URL);
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
}

test.describe('Sauce Demo e-commerce', () => {
  test('standard_user can log in and see the product inventory', async ({ page }) => {
    await loginAsStandardUser(page);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.locator('.inventory_item')).toHaveCount(6);
  });

  test('locked_out_user sees an error message and stays on the login page', async ({ page }) => {
    await page.goto(SAUCE_DEMO_URL);
    await page.getByPlaceholder('Username').fill('locked_out_user');
    await page.getByPlaceholder('Password').fill('secret_sauce');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.locator('[data-test="error"]')).toContainText('locked out');
    await expect(page).toHaveURL(`${SAUCE_DEMO_URL}/`);
  });

  test('adding a product updates the cart badge and persists the item', async ({ page }) => {
    await loginAsStandardUser(page);

    await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    await page.locator('.shopping_cart_link').click();
    await expect(page.locator('.cart_item')).toHaveCount(1);
    await expect(page.locator('.inventory_item_name')).toHaveText('Sauce Labs Backpack');
  });

  test('products can be sorted by price, low to high', async ({ page }) => {
    await loginAsStandardUser(page);

    await page.locator('[data-test="product-sort-container"]').selectOption('lohi');

    const prices = await page.locator('.inventory_item_price').allTextContents();
    const numericPrices = prices.map((p) => parseFloat(p.replace('$', '')));
    const sorted = [...numericPrices].sort((a, b) => a - b);
    expect(numericPrices).toEqual(sorted);
  });
});

test.describe('Playwright documentation site smoke test', () => {
  test('home page loads and links through to the getting-started guide', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    await expect(page).toHaveTitle(/Playwright/);

    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/.*intro/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
