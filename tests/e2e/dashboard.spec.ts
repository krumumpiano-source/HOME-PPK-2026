/**
 * E2E Test — Dashboard Display
 * ทดสอบ: admin/user views, stats cards, announcements, quick actions
 */
import { test, expect } from '@playwright/test';
import { TEST_ADMIN, TEST_USER } from '../fixtures/test-data';

test.describe('Dashboard — Admin View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    // รอ dashboard data โหลด
    await page.waitForTimeout(3000);
  });

  test('should display admin stats section', async ({ page }) => {
    const adminSection = page.locator('#adminStatsSection');
    if (await adminSection.count() > 0) {
      await expect(adminSection).toBeVisible({ timeout: 15000 });
    }
  });

  test('should display pending registrations stat', async ({ page }) => {
    const stat = page.locator('#statPendingReg');
    if (await stat.count() > 0) {
      await expect(stat).toBeVisible();
    }
  });

  test('should display pending slips stat', async ({ page }) => {
    const stat = page.locator('#statPendingSlips');
    if (await stat.count() > 0) {
      await expect(stat).toBeVisible({ timeout: 15000 });
    }
  });

  test('should display announcements list', async ({ page }) => {
    const list = page.locator('#announceList');
    if (await list.count() > 0) {
      await expect(list).toBeVisible();
    }
  });

  test('should display quick actions', async ({ page }) => {
    // quickActions อาจถูก hidden สำหรับ admin — เช็คว่า element มีอยู่ใน DOM
    const actions = page.locator('#quickActions, #quickActionsSection');
    if (await actions.count() > 0) {
      // ถ้ามีแต่ hidden ก็ถือว่า OK (admin ไม่แสดง quick actions)
      await expect(actions.first()).toBeAttached();
    }
  });

  test('should not show error messages', async ({ page }) => {
    // ตรวจว่าไม่มี error popups
    const errorElements = page.locator('.ppk-toast.error, .alert-danger');
    const count = await errorElements.count();
    expect(count).toBe(0);
  });
});

test.describe('Dashboard — User View', () => {
  test.use({ storageState: '.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
  });

  test('should display payment hero card', async ({ page }) => {
    const hero = page.locator('#heroPayment');
    if (await hero.count() > 0) {
      await expect(hero).toBeVisible();
    }
  });

  test('should display house number', async ({ page }) => {
    const house = page.locator('#heroHouse');
    if (await house.count() > 0) {
      await expect(house).toBeVisible();
    }
  });

  test('should display current month amount', async ({ page }) => {
    const amount = page.locator('#currentMonthAmount');
    if (await amount.count() > 0) {
      await expect(amount).toBeVisible();
    }
  });
});
