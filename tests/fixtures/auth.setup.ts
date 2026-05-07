/**
 * Auth Setup — Playwright global setup
 * Login ด้วย test admin + test user แล้ว save storageState ไว้ reuse
 */
import { test as setup, expect } from '@playwright/test';
import { TEST_ADMIN, TEST_USER } from './test-data';

const ADMIN_AUTH_FILE = '.auth/admin.json';
const USER_AUTH_FILE = '.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
  // ไปที่หน้า login
  await page.goto('/login.html');
  await page.waitForLoadState('networkidle');

  // กรอก email + password
  await page.fill('#email', TEST_ADMIN.email);
  await page.fill('#password', TEST_ADMIN.password);

  // กดปุ่ม login
  await page.click('#loginBtn');

  // รอ redirect ไปถึง dashboard.html (waitForURL รอ navigation ให้เสร็จสมบูรณ์ก่อน)
  // ไม่ใช้ waitForFunction เพราะ execution context ถูกทำลายระหว่าง navigation
  await page.waitForURL('**/dashboard.html', { timeout: 30_000 });
  await page.waitForLoadState('networkidle');

  // Save storage state (localStorage + cookies)
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup('authenticate as user', async ({ page }) => {
  // Skip ถ้ายังไม่มี user credentials
  if (!TEST_USER.email || !TEST_USER.password) {
    // สร้าง empty storage state เพื่อไม่ให้ tests ที่ depend crash
    await page.context().storageState({ path: USER_AUTH_FILE });
    setup.skip();
    return;
  }

  await page.goto('/login.html');
  await page.waitForLoadState('networkidle');

  await page.fill('#email', TEST_USER.email);
  await page.fill('#password', TEST_USER.password);
  await page.click('#loginBtn');

  await page.waitForURL('**/dashboard.html', { timeout: 30_000 });
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: USER_AUTH_FILE });
});
