import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  const loginResponse = await page.request.post('http://localhost:5005/api/users/login', {
    data: {
      username: 'admin',
      password: 'Admin@123'
    }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginData = await loginResponse.json();

  await page.route('**/api/branches', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        authorization: `Bearer ${loginData.token}`
      }
    });
  });

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
  await expect(page.getByText('Loading records...')).toBeHidden({ timeout: 15000 });
  await page.getByRole('button', { name: 'Issue Notes' }).click();
    await page.getByRole('button', { name: 'Create Issue Note' }).first().click();
  const createModal = page.locator('.modal-content-inventory').filter({ hasText: 'Create Issue Note' });
  const modalSelects = createModal.locator('select');
  const firstAvailableOption = async (selectIndex) => modalSelects.nth(selectIndex)
    .locator('option:not([value=""])')
    .first();

  const sourceBranchOption = await firstAvailableOption(0);
  await expect(sourceBranchOption).toBeAttached();
  await modalSelects.nth(0).selectOption(await sourceBranchOption.getAttribute('value'));
  await modalSelects.nth(1).selectOption('Branch Transfer');
  const destinationBranchOption = await firstAvailableOption(2);
  await expect(destinationBranchOption).toBeAttached();
  await modalSelects.nth(2).selectOption(await destinationBranchOption.getAttribute('value'));
  await modalSelects.nth(3).selectOption('');
  const itemOption = await firstAvailableOption(4);
  await expect(itemOption).toBeAttached();
  await modalSelects.nth(4).selectOption(await itemOption.getAttribute('value'));
  await page.getByRole('spinbutton', { name: 'Qty' }).fill('1');
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByRole('button', { name: 'Add Issue Note' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(createModal).toBeHidden({ timeout: 15000 });
  await page.getByRole('button', { name: 'Branch Requests' }).click();
});