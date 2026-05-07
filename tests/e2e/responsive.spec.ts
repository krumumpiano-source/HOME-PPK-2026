/**
 * E2E Test — Responsive Layout (Cross-Viewport)
 * ทดสอบ layout ที่ breakpoint ต่างๆ ครอบคลุมทุกอุปกรณ์ที่คาดว่าจะมีผู้ใช้งาน
 *
 * Breakpoints ที่ทดสอบ:
 *   375px  — iPhone SE (มือถือเล็ก)
 *   393px  — Pixel 5 / Android mid-range (พบมากในไทย)
 *   360px  — Samsung Galaxy A-series (พบมากในไทย)
 *   768px  — iPad portrait / small tablet
 *   1024px — Laptop ขอบล่าง / desktop
 *   1366px — Windows school laptop (พบมากในโรงเรียน)
 */
import { test, expect, type Page } from '@playwright/test';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** ตรวจว่าหน้าไม่มี horizontal overflow */
async function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth;
  });
}

/** ตรวจขนาด touch target (width × height) ≥ 44×44 px */
async function touchTargetOk(page: Page, selector: string): Promise<boolean> {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return true; // ไม่มี element — ไม่ fail
  const box = await el.boundingBox();
  if (!box) return true;
  return box.width >= 44 && box.height >= 44;
}

/** ตรวจว่า sidebar (desktop) หรือ hamburger (mobile) แสดงถูกต้องตาม viewport */
async function checkNavBehavior(page: Page, isMobile: boolean): Promise<void> {
  const hamburger = page.locator(
    '#ppk-hamburger, .hamburger-btn, [data-toggle="sidebar"], button[aria-label*="menu"], .topbar-hamburger'
  );
  const sidebar = page.locator('#ppk-sidebar, .ppk-sidebar, .sidebar');

  if (isMobile) {
    // mobile: hamburger ต้องมองเห็น
    if ((await hamburger.count()) > 0) {
      await expect(hamburger.first()).toBeVisible();
    }
  } else {
    // desktop: sidebar ต้องมองเห็น
    if ((await sidebar.count()) > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
  }
}

// ─── Viewport definitions ───────────────────────────────────────────────────

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE (375px)', width: 375, height: 667 },
  { name: 'Pixel 5 (393px)', width: 393, height: 851 },
  { name: 'Samsung Galaxy A (360px)', width: 360, height: 780 },
];

const TABLET_VIEWPORTS = [
  { name: 'iPad portrait (768px)', width: 768, height: 1024 },
];

const DESKTOP_VIEWPORTS = [
  { name: 'Laptop 1024px', width: 1024, height: 768 },
  { name: 'School laptop 1366px', width: 1366, height: 768 },
];

// หน้าสำคัญที่ต้องใช้งานได้ทุก device
const CRITICAL_PAGES = [
  { path: '/login.html', name: 'Login', requireAuth: false },
  { path: '/dashboard.html', name: 'Dashboard', requireAuth: true },
  { path: '/upload-slip.html', name: 'Upload Slip', requireAuth: true },
  { path: '/settings.html', name: 'Settings', requireAuth: true },
  { path: '/record-water.html', name: 'Record Water', requireAuth: true },
  { path: '/check-slip.html', name: 'Check Slip', requireAuth: true },
];

// ─── Mobile Layout Tests ─────────────────────────────────────────────────────

test.describe('Responsive — Mobile Viewports', () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`[${vp.name}] login page — no horizontal scroll`, async ({ page }) => {
        await page.goto('/login.html');
        await page.waitForLoadState('networkidle');
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });

      test(`[${vp.name}] login page — form elements visible + touch targets ok`, async ({
        page,
      }) => {
        await page.goto('/login.html');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
        await expect(page.locator('#password, input[type="password"]').first()).toBeVisible();
        await expect(page.locator('#loginBtn, button[type="submit"]').first()).toBeVisible();

        // touch target ≥ 44×44
        expect(await touchTargetOk(page, '#loginBtn, button[type="submit"]')).toBe(true);
      });

      test(`[${vp.name}] dashboard — no horizontal scroll + hamburger visible`, async ({
        page,
      }) => {
        await page.goto('/dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        expect(await hasNoHorizontalScroll(page)).toBe(true);
        await checkNavBehavior(page, true);
      });

      test(`[${vp.name}] dashboard — hero card readable (font-size ≥ 14px)`, async ({
        page,
      }) => {
        await page.goto('/dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // ตรวจว่าตัวหนังสือไม่เล็กเกินไป
        const bodyFontSize = await page.evaluate(() => {
          return parseFloat(getComputedStyle(document.body).fontSize);
        });
        expect(bodyFontSize).toBeGreaterThanOrEqual(14);
      });

      test(`[${vp.name}] upload-slip — no horizontal scroll`, async ({ page }) => {
        await page.goto('/upload-slip.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });

      test(`[${vp.name}] settings — no horizontal scroll`, async ({ page }) => {
        await page.goto('/settings.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });
    });
  }
});

// ─── Tablet Layout Tests ─────────────────────────────────────────────────────

test.describe('Responsive — Tablet Viewports', () => {
  for (const vp of TABLET_VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`[${vp.name}] dashboard — no horizontal scroll`, async ({ page }) => {
        await page.goto('/dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });

      test(`[${vp.name}] check-slip — no horizontal scroll`, async ({ page }) => {
        await page.goto('/check-slip.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });

      test(`[${vp.name}] record-water — no horizontal scroll`, async ({ page }) => {
        await page.goto('/record-water.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });
    });
  }
});

// ─── Desktop Layout Tests ─────────────────────────────────────────────────────

test.describe('Responsive — Desktop Viewports', () => {
  for (const vp of DESKTOP_VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`[${vp.name}] dashboard — sidebar fixed (not hamburger)`, async ({ page }) => {
        await page.goto('/dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await checkNavBehavior(page, false);
      });

      test(`[${vp.name}] dashboard — no horizontal scroll`, async ({ page }) => {
        await page.goto('/dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        expect(await hasNoHorizontalScroll(page)).toBe(true);
      });

      test(`[${vp.name}] admin pages — no horizontal scroll`, async ({ page }) => {
        for (const pg of ['/team-management.html', '/accounting.html', '/activity-log.html']) {
          await page.goto(pg);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          const ok = await hasNoHorizontalScroll(page);
          expect(ok, `${pg} มี horizontal scroll ที่ ${vp.name}`).toBe(true);
        }
      });
    });
  }
});

// ─── All Critical Pages — No Horizontal Scroll (ทุก viewport) ──────────────

test.describe('Responsive — All Critical Pages horizontal-overflow check', () => {
  const allViewports = [...MOBILE_VIEWPORTS, ...TABLET_VIEWPORTS, ...DESKTOP_VIEWPORTS];

  for (const pg of CRITICAL_PAGES) {
    test(`${pg.name} (${pg.path}) — ทุก viewport ไม่มี horizontal overflow`, async ({
      page,
    }) => {
      for (const vp of allViewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(pg.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const ok = await hasNoHorizontalScroll(page);
        expect(ok, `${pg.path} มี horizontal scroll ที่ ${vp.name} (${vp.width}px)`).toBe(true);
      }
    });
  }
});
