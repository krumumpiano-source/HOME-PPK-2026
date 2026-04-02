/**
 * API Helper — wrapper สำหรับเรียก callBackend() ผ่าน Playwright page context
 */
import { Page, expect } from '@playwright/test';

/**
 * รอจนกว่า ppk-api.js จะ load เสร็จ (callBackend พร้อมใช้)
 */
export async function waitForApiReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as any).callBackend === 'function',
    null,
    { timeout: 15_000 }
  );
}

/**
 * ไปที่ index.html แล้วรอ API พร้อม (ใช้สำหรับ integration tests)
 */
export async function loadApiPage(page: Page): Promise<void> {
  await page.goto('/index.html');
  await page.waitForLoadState('networkidle');
  await waitForApiReady(page);
}

/**
 * เรียก callBackend(action, data) ผ่าน page.evaluate
 * Return ค่า result จาก API ตรงๆ — ไม่ throw ถ้า success=false
 */
export async function callApi(
  page: Page,
  action: string,
  data: Record<string, any> = {}
): Promise<any> {
  return page.evaluate(
    ([a, d]) => (window as any).callBackend(a, d),
    [action, data] as const
  );
}

/**
 * เรียก callBackend แบบ catch error — return { success: false, error } แทน throw
 */
export async function callApiSafe(
  page: Page,
  action: string,
  data: Record<string, any> = {}
): Promise<any> {
  return page.evaluate(
    async ([a, d]) => {
      try {
        return await (window as any).callBackend(a, d);
      } catch (e: any) {
        return { success: false, error: e.message || String(e) };
      }
    },
    [action, data] as const
  );
}

/**
 * Login ผ่าน API แล้ว set sessionToken + currentUser ใน localStorage
 */
export async function loginViaApi(
  page: Page,
  email: string,
  password: string
): Promise<any> {
  await loadApiPage(page);
  const result = await callApi(page, 'login', { email, password });
  if (result?.success && result.token) {
    await page.evaluate(
      ([token, user]) => {
        localStorage.setItem('sessionToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
      },
      [result.token, result.user] as const
    );
  }
  return result;
}
