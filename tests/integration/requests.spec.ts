/**
 * Integration Test — Request Endpoints
 * ทดสอบ: getRequests, getQueue
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN } from '../fixtures/test-data';

test.describe('Requests API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);
  });

  // ─── Get Requests ───

  test('getRequests → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getRequests');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('status');
    }
  });

  test('getRequests with type filter → success', async ({ page }) => {
    const types = ['residence', 'transfer', 'return', 'repair'];
    for (const type of types) {
      const r = await callApi(page, 'getRequests', { type });
      expectSuccess(r, `getRequests type=${type} failed`);
      expect(Array.isArray(r.data)).toBe(true);
    }
  });

  test('getRequests with status filter → success', async ({ page }) => {
    const statuses = ['pending', 'approved', 'rejected'];
    for (const status of statuses) {
      const r = await callApi(page, 'getRequests', { status });
      expectSuccess(r, `getRequests status=${status} failed`);
      expect(Array.isArray(r.data)).toBe(true);
    }
  });

  // ─── Queue ───

  test('getQueue → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getQueue');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('position');
      expect(first).toHaveProperty('status');
    }
  });
});
