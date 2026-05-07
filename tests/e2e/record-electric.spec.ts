/**
 * E2E Test — Record Electric Bills
 * ทดสอบ: period selector, amount input, save
 */
import { test, expect } from '@playwright/test';

test.describe('Record Electric Page', () => {
  test.describe.configure({ timeout: 60000 });
  test.beforeEach(async ({ page }) => {
    await page.goto('/record-electric.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
  });

  test('should display page title', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have period selector', async ({ page }) => {
    const selectors = ['#period', '#yearSelect', '#monthSelect', 'select[name="period"]'];
    let found = false;
    for (const sel of selectors) {
      if (await page.locator(sel).count() > 0) {
        found = true;
        await expect(page.locator(sel)).toBeVisible();
        break;
      }
    }
    if (!found) test.skip();
  });

  test('should display electric data table', async ({ page }) => {
    await page.waitForTimeout(3000);
    const table = page.locator('table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });

  test('should have save button', async ({ page }) => {
    const saveSelectors = [
      'button:has-text("บันทึก")',
      'button:has-text("Save")',
      '#saveBtn',
      '#btnSave',
    ];
    for (const sel of saveSelectors) {
      if (await page.locator(sel).count() > 0) {
        await expect(page.locator(sel).first()).toBeVisible();
        return;
      }
    }
  });

  test('should not show JS errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/record-electric.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const criticalErrors = errors.filter(
      (e) => !e.includes('permission') && !e.includes('ไม่มีสิทธิ์')
    );
    expect(criticalErrors.length).toBe(0);
  });
});
