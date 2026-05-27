/**
 * E2E Test — Login Flow
 * ทดสอบ: form submit, error display, navigation links, session storage
 */
import { test, expect } from '@playwright/test';
import { TEST_ADMIN } from '../fixtures/test-data';

test.describe('Login Page', () => {
  // ไม่ใช้ storageState — ต้อง login ใหม่
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('load');
  });

  test('should display login form with all elements', async ({ page }) => {
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    await page.fill('#email', TEST_ADMIN.email);
    await page.fill('#password', 'WrongPass123!');
    await page.click('#loginBtn');

    // รอ error message แสดง
    await expect(page.locator('#errorMsg')).toBeVisible({ timeout: 15_000 });
    const errorText = await page.locator('#errorMsg').textContent();
    expect(errorText?.length).toBeGreaterThan(0);
  });

  test('should show error on empty fields', async ({ page }) => {
    await page.click('#loginBtn');
    // browser validation หรือ custom validation
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await page.fill('#email', TEST_ADMIN.email);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('#loginBtn');

    // รอ redirect ไป dashboard
    await page.waitForURL('**/dashboard.html', { timeout: 15_000 });
    expect(page.url()).toContain('dashboard.html');

    // ตรวจว่า sessionToken ถูก set
    const token = await page.evaluate(() => localStorage.getItem('sessionToken'));
    expect(token).toBeTruthy();
  });

  test('should navigate to forgot-password page', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot-password"]');
    if (await forgotLink.count() > 0) {
      await forgotLink.first().click();
      await page.waitForURL('**/forgot-password.html');
      expect(page.url()).toContain('forgot-password.html');
    }
  });

  test('should navigate to forgot-email page', async ({ page }) => {
    const forgotLink = page.locator('a[href*="forgot-email"]');
    if (await forgotLink.count() > 0) {
      await forgotLink.first().click();
      await page.waitForURL('**/forgot-email.html');
      expect(page.url()).toContain('forgot-email.html');
    }
  });

  test('should navigate to register page', async ({ page }) => {
    const regLink = page.locator('a[href*="register"]');
    if (await regLink.count() > 0) {
      await regLink.first().click();
      await page.waitForURL('**/register.html');
      expect(page.url()).toContain('register.html');
    }
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.fill('#password', 'TestPass');
    const pwInput = page.locator('#password');

    // ค่าเริ่มต้นเป็น password type
    await expect(pwInput).toHaveAttribute('type', 'password');

    // กดปุ่ม toggle
    const toggleBtn = page.locator('#pwToggleBtn');
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await expect(pwInput).toHaveAttribute('type', 'text');

      await toggleBtn.click();
      await expect(pwInput).toHaveAttribute('type', 'password');
    }
  });
});
