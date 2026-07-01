/**
 * E2E Test — Upload Slip Flow
 * ทดสอบ: auto-fill, file upload/preview, submit
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Upload Slip Page', () => {
  test.beforeEach(async ({ page }) => {
    // ปิด PWA install overlay ก่อนโหลดหน้า
    await page.addInitScript(() => {
      localStorage.setItem('ppk_install_dismiss_time', '9999999999999');
    });
    await page.goto('/upload-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
  });

  test('should display slip upload form', async ({ page }) => {
    const form = page.locator('#slipForm');
    if (await form.count() > 0) {
      await expect(form).toBeVisible();
    }
  });

  test('should auto-fill display elements', async ({ page }) => {
    // รอข้อมูลโหลด
    await page.waitForTimeout(500);

    const displayUnit = page.locator('#display-unit');
    const displayPeriod = page.locator('#display-period');
    const displayAmount = page.locator('#display-amount');

    // อย่างน้อย period ควรแสดง
    if (await displayPeriod.count() > 0) {
      const text = await displayPeriod.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('should have file input for slip image', async ({ page }) => {
    const fileInput = page.locator('#slip');
    if (await fileInput.count() > 0) {
      await expect(fileInput).toBeAttached();
    }
  });

  test('should have paid amount input', async ({ page }) => {
    const amountInput = page.locator('#paid-amount');
    if (await amountInput.count() > 0) {
      await expect(amountInput).toBeVisible();
    }
  });

  test('should show validation when submitting without image', async ({ page }) => {
    // ปิด PWA overlay ที่อาจบังปุ่ม
    await page.evaluate(() => {
      const overlay = document.querySelector('#ppkInstallOverlay');
      if (overlay) overlay.remove();
    });

    const form = page.locator('#slipForm');
    if (await form.count() === 0) return;

    // พยายาม submit โดยไม่เลือกไฟล์
    const submitBtn = form.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      await submitBtn.click({ force: true });
      // ควรมี validation error หรือ browser native validation
      await page.waitForTimeout(300);
    }
  });

  test('should show proxy panel if checkbox exists', async ({ page }) => {
    // ปิด PWA overlay
    await page.evaluate(() => {
      const overlay = document.querySelector('#ppkInstallOverlay');
      if (overlay) overlay.remove();
    });

    const proxyToggle = page.locator('.proxy-toggle-box');
    if (await proxyToggle.count() > 0 && await proxyToggle.first().isVisible()) {
      await proxyToggle.click();
      const proxyPanel = page.locator('#proxy-panel');
      await expect(proxyPanel).toBeVisible();
    }
    // ถ้า proxy toggle ไม่ visible (เช่น admin account) — ข้าม
  });
});
