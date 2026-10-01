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
  await page.getByRole('link', { name: 'Issue Note' }).click();
  await page.getByRole('button', { name: 'Issue Notes' }).click();
  await page.getByRole('button', { name: 'Create Issue Note' }).click();
  const createModal = page.locator('.modal-content-inventory').filter({ hasText: 'Create Issue Note' });
  const modalSelects = createModal.locator('select');
  const firstAvailableOption = async (selectIndex) => modalSelects.nth(selectIndex)
    .locator('option:not([value=""])')
    .first()
    .getAttribute('value');

  await modalSelects.nth(0).selectOption(await firstAvailableOption(0));
  await modalSelects.nth(1).selectOption('Branch Transfer');
  await modalSelects.nth(2).selectOption(await firstAvailableOption(2));
  await modalSelects.nth(3).selectOption(await firstAvailableOption(3));
  await modalSelects.nth(4).selectOption(await firstAvailableOption(4));
  await page.getByRole('spinbutton', { name: 'Qty' }).fill('1');
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByRole('button', { name: 'Add Issue Note' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('button', { name: 'Branch Requests' }).click();
});