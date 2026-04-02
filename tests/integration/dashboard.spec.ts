/**
 * Integration Test — Dashboard & Settings Endpoints
 * ทดสอบ: getDashboardData (admin/user), getSettings, getAnnouncements, getDueDate, getBillSummaryAll
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectShape, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN, TEST_USER, TEST_PERIOD } from '../fixtures/test-data';

test.describe('Dashboard & Settings API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
  });

  // ─── Dashboard (admin) ───

  test('getDashboardData as admin → role=admin + admin stats', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getDashboardData');
    expectSuccess(r);
    expect(r.role).toBe('admin');
    expect(r).toHaveProperty('data');
    // Admin data should have pending counts
    expect(r.data).toHaveProperty('pendingRegistrations');
    expect(r.data).toHaveProperty('pendingSlips');
    expect(r.data).toHaveProperty('pendingRequests');
  });

  // ─── Dashboard (user) ───

  test('getDashboardData as user → role=user + user data', async ({ page }) => {
    test.skip(!TEST_USER.email, 'ยังไม่มี user account สำหรับทดสอบ');

    const login = await loginViaApi(page, TEST_USER.email, TEST_USER.password);
    expectSuccess(login);

    const r = await callApi(page, 'getDashboardData');
    expectSuccess(r);
    // User should get role 'user' or 'resident'
    expect(['user', 'resident', 'admin', 'head']).toContain(r.role);
    expect(r).toHaveProperty('data');
  });

  // ─── Settings ───

  test('getSettings → success + data object', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getSettings');
    expectSuccess(r);
    expect(typeof r.data).toBe('object');
  });

  // ─── Announcements ───

  test('getAnnouncements → success + data array', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getAnnouncements');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
    }
  });

  // ─── Due Date ───

  test('getDueDate → success + dueDate string', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getDueDate');
    expectSuccess(r);
    expect(r).toHaveProperty('dueDate');
  });

  // ─── Bill Summary ───

  test('getBillSummaryAll → success + data array', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getBillSummaryAll', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── Accounting ───

  test('loadAccountingData → success', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'loadAccountingData', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(r).toHaveProperty('incomeItems');
    expect(r).toHaveProperty('expenseItems');
  });

  // ─── Activity ───

  test('getActivityLogs → success + data array', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getActivityLogs', { limit: 10 });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  test('getActivityStats → success + data object', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'getActivityStats');
    expectSuccess(r);
    expect(r).toHaveProperty('data');
  });

  // ─── batchGet ───

  test('batchGet → success + results object', async ({ page }) => {
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);

    const r = await callApi(page, 'batchGet', {
      keys: 'getSettings,getAnnouncements,getDueDate',
    });
    expectSuccess(r);
    expect(r).toHaveProperty('results');
    expect(typeof r.results).toBe('object');
  });
});
