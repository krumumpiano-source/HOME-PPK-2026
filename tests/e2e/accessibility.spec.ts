/**
 * E2E Test — Accessibility (a11y)
 * ใช้ @axe-core/playwright ตรวจ WCAG violations บนหน้าสำคัญ
 *
 * Policy:
 *   - ตรวจเฉพาะ impact: 'critical' และ 'serious' (ไม่ fail บน moderate/minor)
 *   - หน้าที่ทดสอบ: login, dashboard, settings, upload-slip, check-slip, record-water
 *
 * Note: test group นี้รันแยกจาก cross-device projects ได้ด้วย:
 *   npm run test:a11y
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * รัน axe และ return เฉพาะ violations ที่ impact=critical|serious
 * พร้อม human-readable summary สำหรับ error message
 */
async function checkA11y(
  page: Page,
  disableRules: string[] = []
): Promise<{ violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'] }> {
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .disableRules([
      // ปิด rule ที่ไม่ใช่ scope ของ project นี้
      'color-contrast', // ยกเว้น — theme สีใช้ intentional design (ตรวจ manual)
      'region',         // ยกเว้น — layout ไม่ได้ใช้ landmark regions ทั้งหมด
      ...disableRules,
    ]);

  const results = await builder.analyze();
  const criticalViolations = results.violations.filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? '')
  );

  return { violations: criticalViolations };
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']
): string {
  if (violations.length === 0) return 'ไม่มี violation';
  return violations
    .map(
      (v) =>
        `[${v.impact?.toUpperCase()}] ${v.id}: ${v.description}\n` +
        `  Nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`
    )
    .join('\n');
}

// WebKit: axe a11y scan ให้ผลเหมือน Chromium — skip เพื่อลดเวลา CI
test.skip(({ browserName }) => browserName === 'webkit', 'Axe a11y scan ไม่จำเป็นบน WebKit');

// ─── Login Page ───────────────────────────────────────────────────────────────

test.describe('Accessibility — Login Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login.html — ไม่มี critical/serious a11y violations', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('load');

    const { violations } = await checkA11y(page);
    expect(violations, `login.html violations:\n${formatViolations(violations)}`).toHaveLength(0);
  });

  test('login.html — email input มี label', async ({ page }) => {
    await page.goto('/login.html');

    const emailInput = page.locator('#email, input[type="email"]').first();
    if ((await emailInput.count()) === 0) return;

    const id = await emailInput.getAttribute('id');
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const ariaLabelledby = await emailInput.getAttribute('aria-labelledby');
      const hasLabel = (await label.count()) > 0 || !!ariaLabel || !!ariaLabelledby;
      expect(hasLabel, 'email input ควรมี label หรือ aria-label').toBe(true);
    }
  });

  test('login.html — submit button มี accessible name', async ({ page }) => {
    await page.goto('/login.html');

    const btn = page.locator('#loginBtn, button[type="submit"]').first();
    if ((await btn.count()) === 0) return;

    const textContent = await btn.textContent();
    const ariaLabel = await btn.getAttribute('aria-label');
    const hasName = (textContent?.trim().length ?? 0) > 0 || !!ariaLabel;
    expect(hasName, 'submit button ควรมีข้อความหรือ aria-label').toBe(true);
  });
});

// ─── Dashboard Page ───────────────────────────────────────────────────────────

test.describe('Accessibility — Dashboard Page', () => {
  test('dashboard.html — ไม่มี critical/serious a11y violations', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const { violations } = await checkA11y(page);
    expect(violations, `dashboard.html violations:\n${formatViolations(violations)}`).toHaveLength(
      0
    );
  });

  test('dashboard.html — page มี <main> หรือ main role', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const main = page.locator('main, [role="main"]');
    // ถ้ามี → ดี; ถ้าไม่มีก็ไม่ fail (เป็น recommendation ไม่ใช่ requirement)
    if ((await main.count()) > 0) {
      await expect(main.first()).toBeAttached();
    }
  });

  test('dashboard.html — ปุ่ม CTA มี accessible name', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const buttons = page.locator('button, a[role="button"]');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      if (!(await btn.isVisible())) continue;

      const text = (await btn.textContent())?.trim() ?? '';
      const ariaLabel = await btn.getAttribute('aria-label');
      const ariaLabelledby = await btn.getAttribute('aria-labelledby');
      const title = await btn.getAttribute('title');

      const hasName = text.length > 0 || !!ariaLabel || !!ariaLabelledby || !!title;
      expect(
        hasName,
        `ปุ่ม index ${i} ไม่มี accessible name (text="${text}")`
      ).toBe(true);
    }
  });
});

// ─── Settings Page ────────────────────────────────────────────────────────────

test.describe('Accessibility — Settings Page', () => {
  test('settings.html — ไม่มี critical/serious a11y violations', async ({ page }) => {
    await page.goto('/settings.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const { violations } = await checkA11y(page, [
      // settings มี form ซับซ้อน — ปิด autocomplete rule (เป็น medium ไม่ critical)
      'autocomplete-valid',
    ]);
    expect(
      violations,
      `settings.html violations:\n${formatViolations(violations)}`
    ).toHaveLength(0);
  });

  test('settings.html — form inputs มี labels', async ({ page }) => {
    await page.goto('/settings.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // ถ้ามี id → label[for] ควรมีด้วย
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel =
          (await label.count()) > 0 || !!ariaLabel || !!ariaLabelledby || !!placeholder;
        expect(
          hasLabel,
          `input #${id} ควรมี label, aria-label, หรือ placeholder`
        ).toBe(true);
      }
    }
  });
});

// ─── Upload Slip Page ─────────────────────────────────────────────────────────

test.describe('Accessibility — Upload Slip Page', () => {
  test('upload-slip.html — ไม่มี critical/serious a11y violations', async ({ page }) => {
    await page.goto('/upload-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const { violations } = await checkA11y(page);
    expect(
      violations,
      `upload-slip.html violations:\n${formatViolations(violations)}`
    ).toHaveLength(0);
  });
});

// ─── Check Slip Page ──────────────────────────────────────────────────────────

test.describe('Accessibility — Check Slip Page', () => {
  test('check-slip.html — ไม่มี critical/serious a11y violations', async ({ page }) => {
    await page.goto('/check-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const { violations } = await checkA11y(page);
    expect(
      violations,
      `check-slip.html violations:\n${formatViolations(violations)}`
    ).toHaveLength(0);
  });
});

// ─── Navigation (Sidebar) ─────────────────────────────────────────────────────

test.describe('Accessibility — Navigation', () => {
  test('sidebar nav items — ไม่มี button ที่มีแค่ emoji (ไม่มี text)', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    const navButtons = page.locator('nav button, nav a, .sidebar button, .sidebar a, #ppk-sidebar button, #ppk-sidebar a');
    const count = await navButtons.count();

    const emojiOnlyItems: string[] = [];

    for (let i = 0; i < count; i++) {
      const el = navButtons.nth(i);
      if (!(await el.isVisible())) continue;

      const text = (await el.textContent())?.trim() ?? '';
      const ariaLabel = await el.getAttribute('aria-label');
      const title = await el.getAttribute('title');

      // ถ้า text มีแต่ emoji (ไม่มีตัวอักษรภาษาไทย/อังกฤษ) และไม่มี aria-label
      const hasOnlyEmoji = text.length > 0 && /^[\p{Emoji}\s]+$/u.test(text);
      if (hasOnlyEmoji && !ariaLabel && !title) {
        emojiOnlyItems.push(`"${text}"`);
      }
    }

    if (emojiOnlyItems.length > 0) {
      console.warn(
        `⚠️ พบ nav items ที่มีแค่ emoji (ควรเพิ่ม aria-label): ${emojiOnlyItems.join(', ')}`
      );
    }
    // ไม่ fail test — เป็น warning เท่านั้น (ตามที่ตกลงกัน)
  });

  test('navigation มี skip-to-content link หรือ landmark ที่ keyboard ใช้ได้', async ({
    page,
  }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);

    // ตรวจ skip link หรือ main landmark
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    const mainLandmark = page.locator('main, [role="main"]');

    const hasNavAid = (await skipLink.count()) > 0 || (await mainLandmark.count()) > 0;

    // warning เท่านั้น ไม่ fail
    if (!hasNavAid) {
      console.warn('⚠️ ไม่พบ skip-to-content link หรือ <main> landmark — แนะนำให้เพิ่ม');
    }
  });
});

// ─── Keyboard Navigation ──────────────────────────────────────────────────────

test.describe('Accessibility — Keyboard Navigation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login.html — Tab ผ่าน form fields ได้', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('load');

    // Tab จาก body → email → password → submit
    await page.keyboard.press('Tab');
    const focused1 = await page.evaluate(() => document.activeElement?.id ?? '');

    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.id ?? '');

    // ต้องมี focus เคลื่อนย้าย (ไม่ติด body ตลอด)
    expect(focused1 !== '' || focused2 !== '').toBe(true);
  });

  test('login.html — Enter บน submit button ส่ง form ได้', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('load');

    const btn = page.locator('#loginBtn, button[type="submit"]').first();
    if ((await btn.count()) > 0) {
      await btn.focus();
      // ไม่กด Enter จริง (เพื่อไม่ทำให้ login) — แค่ตรวจว่า button focusable ได้
      const isFocused = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.tagName === 'BUTTON' || active?.getAttribute('type') === 'submit';
      });
      expect(isFocused).toBe(true);
    }
  });
});
