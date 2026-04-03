/**
 * Integration Test — Permissions & Edge Cases
 * ทดสอบ: strict admin actions ด้วย user token, permission-gated actions, proxy endpoints
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError } from '../helpers/assertions';
import { TEST_ADMIN, TEST_USER, TEST_PREFIX } from '../fixtures/test-data';

test.describe('Permissions & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
  });

  // ─── Strict admin actions ด้วย user token ─────

  const strictAdminActions = [
    'addHousing',
    'updateHousing',
    'deleteHousing',
    'addResident',
    'updateResident',
    'removeResident',
    'approveRegistration',
    'rejectRegistration',
    'updatePermissions',
    'deleteAnnouncement',
    'exportFullBackup',
  ];

  for (const action of strictAdminActions) {
    test(`${action} as user → permission denied`, async ({ page }) => {
      test.skip(!TEST_USER.email, 'ยังไม่มี user account สำหรับทดสอบ');

      const login = await loginViaApi(page, TEST_USER.email, TEST_USER.password);
      expectSuccess(login);

      const r = await callApiSafe(page, action, { id: 'fake-id' });
      expectError(r);
    });
  }

  // ─── Exemptions ───

  test('getExemptions → success + data object', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getExemptions');
    expectSuccess(r);
    expect(typeof r.data).toBe('object');
  });

  // ─── Proxy ───

  test('getMyProxyAssignments → success + data array', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getMyProxyAssignments');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── User Management (admin) ───

  test('getUsersList as admin → success + data array', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getUsersList');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      expect(r.data[0]).toHaveProperty('email');
      expect(r.data[0]).toHaveProperty('role');
    }
  });

  test('getMemberStatus as admin → success', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getMemberStatus');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  test('getAllPermissions as admin → success', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getAllPermissions');
    expectSuccess(r);
    expect(typeof r.data).toBe('object');
  });

  // ─── Regulations ───

  test('getRegulationsPdf → success or not-found', async ({ page }) => {
    const r = await callApi(page, 'getRegulationsPdf');
    // อาจ success (มี PDF) หรือ fail (ยังไม่ upload)
    expect(r).toBeTruthy();
    expect(typeof r.success).toBe('boolean');
  });

  // ─── Email Settings (admin) ───

  test('getEmailSettings as admin → success', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getEmailSettings');
    expectSuccess(r);
    expect(r).toHaveProperty('settings');
  });

  // ─── Monthly Withdraw ───

  test('getMonthlyWithdraw → success', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getMonthlyWithdraw', { period: '2026-03' });
    expectSuccess(r);
    expect(r).toHaveProperty('data');
  });
});
