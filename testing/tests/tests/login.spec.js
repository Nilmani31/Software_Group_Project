import { test, expect } from '@playwright/test';

test('redirects direct dashboard navigation to login without a session', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');

  await expect(page).toHaveURL('http://localhost:3000/login');
  await expect(page.getByRole('heading', { name: 'CBBS Inventory System' })).toBeVisible();
});

test('allows dashboard navigation after login', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Admin@123');
  await page.getByRole('button', { name: 'Sign In to Portal' }).click();
  await expect(page).toHaveURL('http://localhost:3000/dashboard');

  await page.goto('http://localhost:3000/dashboard');
  await expect(page).toHaveURL('http://localhost:3000/dashboard');

  await page.getByRole('button', { name: 'Sign out' }).click();
});