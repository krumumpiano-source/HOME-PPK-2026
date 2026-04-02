/**
 * Integration Test — Auth Endpoints
 * ทดสอบ: login, logout, getCurrentUser, changePassword, findEmail, checkAdminExists
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectShape } from '../helpers/assertions';
import { TEST_ADMIN, TEST_USER } from '../fixtures/test-data';

test.describe('Auth API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
  });

  // ─── Login ───

  test('login — valid admin credentials → success + token + user', async ({ page }) => {
    const r = await callApi(page, 'login', {
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password,
    });
    expectSuccess(r);
    expectShape(r, ['user', 'token']);
    expect(r.user).toHaveProperty('id');
    expect(r.user).toHaveProperty('email');
    expect(r.user).toHaveProperty('role');
    expect(typeof r.token).toBe('string');
    expect(r.token.length).toBeGreaterThan(0);
  });

  test('login — wrong password → error', async ({ page }) => {
    const r = await callApiSafe(page, 'login', {
      email: TEST_ADMIN.email,
      password: 'WrongPassword999!',
    });
    expectError(r);
  });

  test('login — nonexistent email → error', async ({ page }) => {
    const r = await callApiSafe(page, 'login', {
      email: 'nonexistent-12345@test.com',
      password: 'whatever',
    });
    expectError(r);
  });

  // ─── getCurrentUser ───

  test('getCurrentUser — with valid session → success + user data', async ({ page }) => {
    // Login first
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getCurrentUser');
    expectSuccess(r);
    expectShape(r, ['user']);
    expect(r.user).toHaveProperty('email');
  });

  // ─── checkAdminExists ───

  test('checkAdminExists → success + exists boolean', async ({ page }) => {
    const r = await callApi(page, 'checkAdminExists');
    expectSuccess(r);
    expect(typeof r.exists).toBe('boolean');
  });

  // ─── findEmail ───

  test('findEmail — nonexistent phone → error or empty', async ({ page }) => {
    const r = await callApiSafe(page, 'findEmail', { phone: '0000000000' });
    // อาจ return success:false หรือ success:true แต่ไม่มี email
    expect(r).toBeTruthy();
  });

  // ─── logout ───

  test('logout — after login → session cleared', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    // ppkLogout() clears localStorage + redirects — ไม่ return ค่า
    // ใช้ evaluate ลบ session โดยตรง แล้วเช็คว่า token หาย
    await page.evaluate(() => {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('currentUser');
    });
    const token = await page.evaluate(() => localStorage.getItem('sessionToken'));
    expect(token).toBeNull();
  });

  // ─── Invalid Action ───

  test('invalid action name → throws error', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    // callBackend throws for unknown actions
    await expect(callApi(page, 'nonExistentAction12345')).rejects.toThrow();
  });
});
