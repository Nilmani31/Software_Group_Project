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
  await page.getByRole('button', { name: 'Login' }).click();
  
  await page.locator('a[href="/inventory"]').click();
  await page.getByRole('button', { name: '+ Add new Item' }).click();
  await page.getByRole('textbox', { name: 'Enter item name' }).click();
  await page.getByRole('textbox', { name: 'Enter item name' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Enter item name' }).fill('G');
  await page.getByRole('textbox', { name: 'Enter item name' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Enter item name' }).fill('Glass');
  await page.locator('select[name="category"]').selectOption('Equipment');
  await page.locator('select[name="unit"]').selectOption('pcs');
  await page.getByRole('spinbutton', { name: 'e.g. 2500' }).click();
  await page.getByRole('spinbutton', { name: 'e.g. 2500' }).fill('2500');
  await page.locator('input[name="minStock"]').fill('1');
  await page.locator('input[name="maxStock"]').fill('17');
  await page.getByRole('button', { name: 'Add Item' }).click();
  const confirmationDialog = page.getByRole('alertdialog');
  await expect(confirmationDialog).toBeVisible();
  await confirmationDialog.getByRole('button', { name: 'Add', exact: true }).click({ force: true });

});