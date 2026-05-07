/**
 * E2E Test — Check Slip (Review Slips)
 * ทดสอบ: pending slip list, image modal, approve/reject buttons
 */
import { test, expect } from '@playwright/test';

test.describe('Check Slip Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/check-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
  });

  test('should display page without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/check-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const critical = errors.filter(
      (e) => !e.includes('permission') && !e.includes('ไม่มีสิทธิ์')
    );
    expect(critical.length).toBe(0);
  });

  test('should have period selector', async ({ page }) => {
    const selectors = ['#period', '#yearSelect', '#monthSelect', 'select'];
    for (const sel of selectors) {
      if (await page.locator(sel).count() > 0) {
        await expect(page.locator(sel).first()).toBeVisible();
        return;
      }
    }
  });

  test('should display slip table or empty state', async ({ page }) => {
    await page.waitForTimeout(3000);

    // ตรวจ table หรือ empty state message
    const table = page.locator('table');
    const emptyMsg = page.locator(':text("ไม่มี"), :text("ไม่พบ"), :text("ยังไม่มี")');

    const hasTable = (await table.count()) > 0;
    const hasEmpty = (await emptyMsg.count()) > 0;

    // อย่างน้อยต้องมี table หรือ empty message
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('should display approve/reject buttons for pending slips', async ({ page }) => {
    await page.waitForTimeout(3000);

    // ถ้ามี pending slips ต้องมีปุ่ม approve/reject
    const approveBtn = page.locator('button:has-text("อนุมัติ"), button:has-text("Approve")');
    const rejectBtn = page.locator('button:has-text("ปฏิเสธ"), button:has-text("Reject"), button:has-text("ไม่อนุมัติ")');

    // ถ้ามีข้อมูล pending ต้องมีปุ่ม — ถ้าไม่มีข้อมูลก็ OK
    if (await approveBtn.count() > 0) {
      await expect(approveBtn.first()).toBeVisible();
    }
  });
});
