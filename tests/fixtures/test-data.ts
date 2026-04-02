/**
 * Test Data Constants — HOME PPK 2026
 * ค่าคงที่สำหรับ test ทุกตัว อ่านจาก environment variables ก่อน fallback เป็นค่า default
 */

export const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin@ppk.test',
  password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin@2026!',
};

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || '',
  password: process.env.TEST_USER_PASSWORD || '',
};

export const TEST_HOUSE = {
  house_number: process.env.TEST_HOUSE_NUMBER || 'TEST-001',
  type: (process.env.TEST_HOUSE_TYPE || 'house') as 'house' | 'flat',
};

export const TEST_PERIOD = process.env.TEST_PERIOD || '2026-03';

/** Prefix สำหรับ test data ทั้งหมด — ใช้ cleanup */
export const TEST_PREFIX = 'TEST-';

/** URLs */
export const BASE_URL = process.env.BASE_URL || 'http://localhost:5500';
export const PROD_URL = process.env.PROD_URL || 'https://harmoni-4xm.pages.dev';
