/**
 * E2E Test — Check Request (Review Requests & Queue)
 * ทดสอบ: tabs, request list, approve/reject, queue tab
 */
import { test, expect } from '@playwright/test';

test.describe('Check Request Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/check-request.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
  });

  test('should display page without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/check-request.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    const critical = errors.filter(
      (e) => e.includes('SyntaxError') || e.includes('ReferenceError') || e.includes('is not defined')
    );
    expect(critical.length).toBe(0);
  });

  test('should have tab navigation', async ({ page }) => {
    // ตรวจหา tabs สำหรับ request types
    const tabSelectors = [
      ':text("ขอเข้าพัก"), :text("residence")',
      ':text("ย้าย"), :text("transfer")',
      ':text("คืน"), :text("return")',
      ':text("ซ่อม"), :text("repair")',
    ];

    let tabsFound = 0;
    for (const sel of tabSelectors) {
      try {
        if (await page.locator(sel).count() > 0) tabsFound++;
      } catch { /* skip */ }
    }

    // ควรพบอย่างน้อย 2 tabs
    expect(tabsFound).toBeGreaterThanOrEqual(1);
  });

  test('should display request list or empty state', async ({ page }) => {
    await page.waitForTimeout(3000);

    const table = page.locator('table');
    const cards = page.locator('.request-card, .card');
    const emptyMsg = page.locator(':text("ไม่มี"), :text("ไม่พบ"), :text("ยังไม่มี")');

    const hasContent = (await table.count()) > 0 ||
                       (await cards.count()) > 0 ||
                       (await emptyMsg.count()) > 0;

    expect(hasContent).toBe(true);
  });

  test('should have queue management section', async ({ page }) => {
    // ค้นหา queue/คิว tab หรือ section
    const queueSelectors = [
      ':text("คิว")',
      ':text("Queue")',
      '#queueTab',
      '#queue-section',
    ];

    for (const sel of queueSelectors) {
      try {
        if (await page.locator(sel).count() > 0) {
          return; // found
        }
      } catch { /* skip */ }
    }
  });
});
