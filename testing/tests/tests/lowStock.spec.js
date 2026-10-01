import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Password' }).fill('A');
  await page.getByRole('textbox', { name: 'Password' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Password' }).fill('Admin@123');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Low Stock', exact: true }).click();
  await page.getByRole('row').nth(1).getByRole('button', { name: 'Order Restock' }).click();
  await page.getByRole('button', { name: 'Transfer from Internal Branch' }).click();
  await page.getByRole('option', { name: 'Transfer from Internal Branch Surplus' }).click();
  await page.getByRole('button', { name: 'Transfer from Internal Branch' }).click();
  await page.getByRole('option', { name: 'Procure from External Supplier' }).click();
  await expect(page.getByText('No active suppliers found in')).toBeVisible();
  await page.getByRole('button', { name: 'Close modal' }).click();
});