/**
 * Custom Assertions — ตรวจสอบ API response format
 */
import { expect } from '@playwright/test';

/** Assert API ตอบ success */
export function expectSuccess(result: any, msg?: string): void {
  expect(result, msg).toBeTruthy();
  expect(result.success, msg || `Expected success=true, got: ${JSON.stringify(result)}`).toBe(true);
}

/** Assert API ตอบ error */
export function expectError(result: any, msg?: string): void {
  expect(result, msg).toBeTruthy();
  expect(result.success, msg || `Expected success=false, got: ${JSON.stringify(result)}`).toBe(false);
}

/** Assert response มี keys ที่กำหนด */
export function expectShape(result: any, keys: string[], msg?: string): void {
  expect(result, msg).toBeTruthy();
  for (const key of keys) {
    expect(result, `Missing key "${key}" in response`).toHaveProperty(key);
  }
}

/** Assert response.data เป็น array */
export function expectDataArray(result: any, msg?: string): void {
  expectSuccess(result, msg);
  expect(Array.isArray(result.data), `Expected data to be array, got: ${typeof result.data}`).toBe(true);
}

/** Assert response.data เป็น object ที่มี keys */
export function expectDataObject(result: any, keys: string[], msg?: string): void {
  expectSuccess(result, msg);
  expect(typeof result.data, `Expected data to be object`).toBe('object');
  for (const key of keys) {
    expect(result.data, `Missing key "${key}" in data`).toHaveProperty(key);
  }
}
