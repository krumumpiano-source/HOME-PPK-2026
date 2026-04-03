/**
 * Integration Test — Payment / Slip Endpoints
 * ทดสอบ: getSlipSubmissions, getPaymentHistory, getNotificationHistory
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN, TEST_PERIOD } from '../fixtures/test-data';

test.describe('Payment & Slip API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);
  });

  // ─── Slip Submissions ───

  test('getSlipSubmissions → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getSlipSubmissions', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('house_number');
      expect(first).toHaveProperty('status');
    }
  });

  test('getSlipSubmissions with status filter → success', async ({ page }) => {
    const r = await callApi(page, 'getSlipSubmissions', {
      period: TEST_PERIOD,
      status: 'pending',
    });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── Payment History ───

  test('getPaymentHistory → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getPaymentHistory');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('house_number');
      expect(first).toHaveProperty('period');
      expect(first).toHaveProperty('amount_paid');
    }
  });

  test('getPaymentHistory with limit → success', async ({ page }) => {
    const r = await callApi(page, 'getPaymentHistory', { limit: 5 });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    expect(r.data.length).toBeLessThanOrEqual(5);
  });

  // ─── Notification History ───

  test('getNotificationHistory → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getNotificationHistory', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });
});
