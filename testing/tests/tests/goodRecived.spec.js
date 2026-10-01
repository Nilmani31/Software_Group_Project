import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  const poNumber = `PO-TEST-${Date.now()}`;
  const purchaseOrderResponse = await page.request.post('http://localhost:5005/api/purchase-orders', {
    data: {
      poNumber,
      status: 'Pending',
      orderType: 'Supplier',
      supplier: 'Playwright Supplier',
      createdBy: 'admin',
      createdByBranch: 'Colombo Main Branch',
      items: ['Test Item - unit x 1']
    }
  });
  expect(purchaseOrderResponse.ok()).toBeTruthy();

  await page.goto('http://localhost:3000/');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('admin');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Password' }).fill('A');
  await page.getByRole('textbox', { name: 'Password' }).press('CapsLock');
  await page.getByRole('textbox', { name: 'Password' }).fill('Admin@123');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: 'Good Received' }).click();
  await page.getByRole('button', { name: '+ New GRN' }).click();
  await page.getByRole('button', { name: 'Select Purchase Order' }).click();
  const pendingPurchaseOrder = page.getByRole('option').filter({ hasText: 'Pending' }).first();
  await expect(pendingPurchaseOrder).toBeVisible();
  await pendingPurchaseOrder.click();
  await page.locator('input[name="items.0.quantityReceived"]').fill('1');
  await page.locator('input[name="items.0.quantityReceived"]').click();
  await page.getByRole('button', { name: 'Create Goods Received Note' }).click();
  await page.getByRole('button', { name: 'Add' }).click();
});