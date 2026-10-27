import { test, expect } from '@playwright/test';

test('creates and verifies an inventory category', async ({ page }) => {
  const loginResponse = await page.request.post('http://localhost:5005/api/users/login', {
    data: {
      username: 'admin',
      password: 'Admin@123'
    }
  });
  expect(loginResponse.ok()).toBeTruthy();
  const { token } = await loginResponse.json();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const categoryName = `Playwright Category ${Date.now()}`;
  const description = 'Category created by the automated test';
  let createdCategoryId;

  await page.route('**/api/categories**', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        authorization: `Bearer ${token}`
      }
    });
  });

  try {
    await page.goto('http://localhost:3000/');
    await page.getByRole('textbox', { name: 'Username' }).fill('admin');
    await page.getByRole('textbox', { name: 'Password' }).fill('Admin@123');
    await page.getByRole('button', { name: 'Sign In to Portal' }).click();

    await page.getByRole('link', { name: 'Categories', exact: true }).click();
    await page.getByRole('button', { name: '+ Add Category' }).click();
    await page.getByPlaceholder('e.g. Coffee Beans, Dairy, Paper Cups').fill(categoryName);
    await page.getByPlaceholder('Describe product types included in this category...').fill(description);
    await page.getByRole('button', { name: 'Create Category' }).click();

    const confirmationDialog = page.getByRole('alertdialog');
    await expect(confirmationDialog).toBeVisible();
    await confirmationDialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByText(categoryName, { exact: true })).toBeVisible({ timeout: 15000 });

    const categoriesResponse = await page.request.get('http://localhost:5005/api/categories', {
      headers: authHeaders
    });
    expect(categoriesResponse.ok()).toBeTruthy();
    const categories = await categoriesResponse.json();
    const createdCategory = categories.find((category) => category.name === categoryName);
    expect(createdCategory).toMatchObject({
      name: categoryName,
      description
    });
    createdCategoryId = createdCategory._id;

    const searchBox = page.getByPlaceholder('Search categories by name or description...');
    await searchBox.fill(categoryName);
    await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  } finally {
    if (createdCategoryId) {
      const deleteResponse = await page.request.delete(
        `http://localhost:5005/api/categories/${createdCategoryId}`,
        { headers: authHeaders }
      );
      expect(deleteResponse.ok()).toBeTruthy();
    }
  }
});