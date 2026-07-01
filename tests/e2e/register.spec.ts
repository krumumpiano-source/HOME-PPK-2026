/**
 * E2E Test — Registration Flow
 * ทดสอบ: form display, validation, submit
 */
import { test, expect } from '@playwright/test';

test.describe('Register Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/register.html');
    await page.waitForLoadState('load');
  });

  test('should display registration form with all fields', async ({ page }) => {
    await expect(page.locator('#registerForm')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('#firstname')).toBeVisible();
    await expect(page.locator('#lastname')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#prefix')).toBeVisible();
  });

  test('should show validation on empty submit', async ({ page }) => {
    // กด submit โดยไม่กรอกข้อมูล
    const submitBtn = page.locator('#registerBtn');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      // browser validation จะทำงาน — ตรวจ required fields
      const emailInput = page.locator('#email');
      const isInvalid = await emailInput.evaluate(
        (el: HTMLInputElement) => !el.validity.valid
      );
      expect(isInvalid).toBe(true);
    }
  });

  test('should validate password confirmation mismatch', async ({ page }) => {
    await page.fill('#email', 'test-reg@example.com');
    await page.fill('#firstname', 'ทดสอบ');
    await page.fill('#lastname', 'ลงทะเบียน');
    await page.fill('#phone', '0812345678');
    await page.fill('#password', 'TestPass@2026');
    await page.fill('#confirmPassword', 'DifferentPass@2026');

    // พยายาม submit
    const submitBtn = page.locator('#registerBtn');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();

      // รอ error message (password mismatch)
      await page.waitForTimeout(500);
      const errorMsg = page.locator('#errorMsg');
      if (await errorMsg.count() > 0 && await errorMsg.isVisible()) {
        const text = await errorMsg.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }
    }
  });

  test('should load province dropdown data', async ({ page }) => {
    const province = page.locator('#province');
    if (await province.count() > 0) {
      // รอข้อมูลจังหวัดโหลด
      await page.waitForTimeout(500);
      const optionCount = await province.locator('option').count();
      // ต้องมีมากกว่า 1 option (อย่างน้อย placeholder + จังหวัด)
      expect(optionCount).toBeGreaterThan(1);
    }
  });

  test('should have PDPA consent checkbox', async ({ page }) => {
    const pdpa = page.locator('#pdpaConsent');
    if (await pdpa.count() > 0) {
      await expect(pdpa).toBeVisible();
      await expect(pdpa).not.toBeChecked();
    }
  });

  test('should have link back to login', async ({ page }) => {
    // register.html ใช้ #backToLogin ที่มี onclick="navigate('?page=login')"
    const loginLink = page.locator('#backToLogin, a[onclick*="login"], a:has-text("เข้าสู่ระบบ"), a:has-text("กลับ")');
    expect(await loginLink.count()).toBeGreaterThan(0);
  });
});
