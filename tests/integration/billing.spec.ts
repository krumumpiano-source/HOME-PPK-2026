/**
 * Integration Test — Billing Endpoints (Water + Electric)
 * ทดสอบ: getWaterBillTotal, getElectricBills, getElectricBillPEA, getOutstanding
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN, TEST_PERIOD } from '../fixtures/test-data';

test.describe('Billing API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);
  });

  // ─── Water ───

  test('getWaterBillTotal → success + data with total', async ({ page }) => {
    const r = await callApi(page, 'getWaterBillTotal', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(r.data).toHaveProperty('total');
    expect(typeof r.data.total).toBe('number');
  });

  // ─── Electric ───

  test('getElectricBills → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getElectricBills', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  test('getElectricBillPEA → success + data with total', async ({ page }) => {
    const r = await callApi(page, 'getElectricBillPEA', { period: TEST_PERIOD });
    expectSuccess(r);
    expect(r.data).toHaveProperty('total');
  });

  // ─── Outstanding ───

  test('getOutstanding → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getOutstanding');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('period');
      expect(first).toHaveProperty('house_number');
      expect(first).toHaveProperty('status');
    }
  });

  test('getOutstanding with houseNumber filter → success', async ({ page }) => {
    const r = await callApi(page, 'getOutstanding', { houseNumber: 'บ้าน 1' });
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });
});
