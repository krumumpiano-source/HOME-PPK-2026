/**
 * Integration Test — Resident Endpoints
 * ทดสอบ: getResidents, getResidentsList, addResident, updateResident, removeResident, getCoresidents
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN, TEST_USER, TEST_PREFIX } from '../fixtures/test-data';

test.describe('Residents API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);
  });

  // ─── Read ───

  test('getResidents → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getResidents');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const first = r.data[0];
      expect(first).toHaveProperty('firstname');
      expect(first).toHaveProperty('lastname');
    }
  });

  test('getResidentsList → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getResidentsList');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── getCoresidents ───

  test('getCoresidents → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getCoresidents');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  test('getStaffCoresidents → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getStaffCoresidents');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── checkDuplicateResident ───

  test('checkDuplicateResident → success + duplicates array', async ({ page }) => {
    const r = await callApi(page, 'checkDuplicateResident', {
      firstname: 'ไม่มีชื่อนี้ในระบบ',
      lastname: 'ทดสอบ999',
    });
    expectSuccess(r);
    expect(Array.isArray(r.duplicates)).toBe(true);
    expect(r.duplicates.length).toBe(0);
  });

  // ─── Permission guard ───

  test('addResident as user → permission denied', async ({ page }) => {
    test.skip(!TEST_USER.email, 'ยังไม่มี user account สำหรับทดสอบ');

    const login = await loginViaApi(page, TEST_USER.email, TEST_USER.password);
    expectSuccess(login);

    const r = await callApiSafe(page, 'addResident', {
      firstname: 'TestDenied',
      lastname: 'User',
      prefix: 'นาย',
      phone: '0999999999',
      email: `denied-${Date.now()}@test.com`,
    });
    expectError(r);
  });
});
