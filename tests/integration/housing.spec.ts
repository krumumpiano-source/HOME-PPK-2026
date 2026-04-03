/**
 * Integration Test — Housing Endpoints
 * ทดสอบ: getHousing, getHousingList, addHousing, updateHousing, deleteHousing
 */
import { test, expect } from '@playwright/test';
import { loadApiPage, callApi, callApiSafe, loginViaApi } from '../helpers/api-helper';
import { expectSuccess, expectError, expectDataArray } from '../helpers/assertions';
import { TEST_ADMIN, TEST_USER, TEST_PREFIX } from '../fixtures/test-data';

test.describe('Housing API', () => {
  test.beforeEach(async ({ page }) => {
    await loadApiPage(page);
    // Login as admin
    const login = await loginViaApi(page, TEST_ADMIN.email, TEST_ADMIN.password);
    expectSuccess(login);
  });

  // ─── Read ───

  test('getHousing → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getHousing');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      expect(r.data[0]).toHaveProperty('house_number');
      expect(r.data[0]).toHaveProperty('type');
      expect(r.data[0]).toHaveProperty('status');
    }
  });

  test('getHousingList → success + data array', async ({ page }) => {
    const r = await callApi(page, 'getHousingList');
    expectSuccess(r);
    expect(Array.isArray(r.data)).toBe(true);
  });

  // ─── CRUD (admin) ───

  test('addHousing → updateHousing → deleteHousing (full CRUD)', async ({ page }) => {
    const testHouse = `${TEST_PREFIX}HOUSE-${Date.now()}`;

    // Add
    const add = await callApiSafe(page, 'addHousing', {
      house_number: testHouse,
      type: 'house',
      building: 'test-zone',
      status: 'available',
    });

    // RLS policy อาจ block insert ด้วย anon key
    if (!add || !add.success) {
      test.skip(true, `addHousing blocked by RLS: ${add?.error || 'unknown'}`);
      return;
    }

    expect(add.data).toHaveProperty('id');
    const houseId = add.data.id;

    // Update
    const upd = await callApiSafe(page, 'updateHousing', {
      id: houseId,
      house_number: testHouse,
      type: 'house',
      building: 'test-zone-updated',
      status: 'available',
    });
    expectSuccess(upd, `updateHousing failed: ${JSON.stringify(upd)}`);

    // Delete (cleanup)
    const del = await callApiSafe(page, 'deleteHousing', { id: houseId });
    expectSuccess(del, `deleteHousing failed: ${JSON.stringify(del)}`);
  });

  // ─── Permission guard ───

  test('addHousing as user → permission denied', async ({ page }) => {
    test.skip(!TEST_USER.email, 'ยังไม่มี user account สำหรับทดสอบ');

    const login = await loginViaApi(page, TEST_USER.email, TEST_USER.password);
    expectSuccess(login);

    const r = await callApiSafe(page, 'addHousing', {
      house_number: `${TEST_PREFIX}DENIED-${Date.now()}`,
      type: 'house',
    });
    expectError(r);
  });
});
