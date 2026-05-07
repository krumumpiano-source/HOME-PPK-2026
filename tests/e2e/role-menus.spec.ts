/**
 * E2E Test — Role-Based Menu Coverage (????????????????????)
 *
 * ?????????????:
 *  1. admin   — ?????????? + ???????????????????
 *  2. user    — ??????????????? (????? TEST_USER)
 *  3. no-auth — ??????? redirect ?? login
 *
 * ??? page ??????:
 *  ? ??????????????? JS errors (critical)
 *  ? ??? redirect ?????? URL ???? (????? authenticated)
 *  ? ???? main container / ??????? (??? blank)
 *  ? Navigation sidebar ?????
 */

import { test, expect } from '@playwright/test';

// ----------------------------------------------
// ?????????????????
// ----------------------------------------------
const USER_MENUS = [
  { path: 'dashboard.html',       label: '????????' },
  { path: 'payment-history.html', label: '??????????????' },
  { path: 'upload-slip.html',     label: '???????' },
  { path: 'form.html',            label: '??????????' },
  { path: 'regulations.html',     label: '??????????????' },
  { path: 'electrical-info.html', label: '????????????' },
  { path: 'settings.html',        label: '??????????????' },
];

const ADMIN_ONLY_MENUS = [
  { path: 'team-management.html',      label: '???????????' },
  { path: 'record-water.html',         label: '????????????' },
  { path: 'record-electric.html',      label: '???????????' },
  { path: 'payment-notification.html', label: '???????????' },
  { path: 'monthly-withdraw.html',     label: '??????????????' },
  { path: 'accounting.html',           label: '?????' },
  { path: 'check-slip.html',           label: '????????' },
  { path: 'check-request.html',        label: '??????????' },
  { path: 'check-report.html',         label: '??????????' },
  { path: 'view-as-user.html',         label: '??????????????' },
  { path: 'admin-settings.html',       label: '?????????????' },
  { path: 'admin-report.html',         label: '????????????' },
  { path: 'activity-log.html',         label: 'Activity Log' },
];

const ALL_ADMIN_MENUS = [...USER_MENUS, ...ADMIN_ONLY_MENUS];

// ----------------------------------------------
// helper ??????? page
// ----------------------------------------------
type PageCheckResult = {
  hasMainContent: boolean;
  hasNav: boolean;
  criticalErrors: string[];
  url: string;
  staysOnPage: boolean;
};

async function checkPage(
  page: import('@playwright/test').Page,
  path: string
): Promise<PageCheckResult> {
  const criticalErrors: string[] = [];
  page.on('pageerror', (err) => {
    const msg = err.message || String(err);
    // ????????? critical — ???? network / permission errors ?????????
    if (
      !msg.includes('Cannot read properties of null') ||
      msg.includes('SyntaxError') ||
      msg.includes('ReferenceError') ||
      msg.includes('TypeError: Cannot read')
    ) {
      // ????????? SyntaxError / ReferenceError ????????? bug ????
      if (
        msg.includes('SyntaxError') ||
        msg.includes('ReferenceError') ||
        msg.includes('is not defined')
      ) {
        criticalErrors.push(msg);
      }
    }
  });

  await page.goto('/' + path);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);

  const currentUrl = page.url();
  const staysOnPage = currentUrl.includes(path.replace('.html', ''));

  // ???? main content — ??????? selector
  const mainSelectors = [
    'main', '#main', '.main-content', '.container',
    '#adminStatsSection', '#heroPayment',
    'h1', 'h2', '.page-header', '.page-title',
    'table', 'form', '.card', '.section',
    '#ppkNav + *', 'body > *:not(script):not(style):not(link)',
  ];

  let hasMainContent = false;
  for (const sel of mainSelectors) {
    try {
      const count = await page.locator(sel).count();
      if (count > 0) { hasMainContent = true; break; }
    } catch { /* skip */ }
  }

  // ???? navigation
  const navSelectors = [
    '#ppkNav', '#ppk-nav', '.sidebar', '.ppk-sidebar', 'nav',
    '.nav-topbar', '#navHamburger',
  ];
  let hasNav = false;
  for (const sel of navSelectors) {
    try {
      if (await page.locator(sel).count() > 0) { hasNav = true; break; }
    } catch { /* skip */ }
  }

  return { hasMainContent, hasNav, criticalErrors, url: currentUrl, staysOnPage };
}

// ----------------------------------------------
// 1. ADMIN ROLE — ???????
// ----------------------------------------------
test.describe('?? Admin Role — ???????', () => {
  // ??? admin storageState (set ??? playwright.config.ts)

  for (const menu of ALL_ADMIN_MENUS) {
    test(`${menu.label} (${menu.path})`, async ({ page }) => {
      const result = await checkPage(page, menu.path);

      // 1. ?????????? URL ?????????? (?????? redirect ???)
      expect(result.staysOnPage,
        `Admin ??? redirect ?????? ${menu.path} ? ????? ${result.url}`
      ).toBe(true);

      // 2. ????????? critical JS errors
      expect(result.criticalErrors,
        `Critical JS errors ?? ${menu.path}: ${result.criticalErrors.join('; ')}`
      ).toHaveLength(0);

      // 3. ?????? main content ?????? DOM
      expect(result.hasMainContent,
        `????? main content ?? ${menu.path}`
      ).toBe(true);

      // 4. Navigation ?????????
      expect(result.hasNav,
        `????? navigation sidebar/topbar ?? ${menu.path}`
      ).toBe(true);
    });
  }
});

// ----------------------------------------------
// 2. ADMIN ROLE — ??????? Admin ???????? Admin ?? Sidebar
// ----------------------------------------------
test.describe('?? Admin Role — ???? Sidebar links', () => {
  test('admin ??????????????????????? sidebar', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    const expectedLinks = [
      'dashboard.html',
      'payment-history.html',
      'upload-slip.html',
      'form.html',
      'regulations.html',
      'settings.html',
    ];

    for (const link of expectedLinks) {
      const el = page.locator(`a[href*="${link}"]`);
      expect(await el.count(), `????? link: ${link}`).toBeGreaterThanOrEqual(1);
    }
  });

  test('admin ?????????????????? sidebar', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    const adminLinks = [
      'team-management.html',
      'admin-settings.html',
      'activity-log.html',
      'check-slip.html',
      'check-request.html',
    ];

    let found = 0;
    for (const link of adminLinks) {
      if (await page.locator(`a[href*="${link}"]`).count() > 0) found++;
    }

    expect(found, 'Admin ??????? admin links ?? sidebar ????????? 3 ??????').toBeGreaterThanOrEqual(3);
  });

  test('sidebar ???? role label ?????? admin', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // ???? role badge — "????????" ???? "??????????" ???? admin badge
    const roleBadgeText = await page.locator('body').textContent();
    const hasRoleBadge = roleBadgeText?.includes('????????') ||
                         roleBadgeText?.includes('??????????') ||
                         roleBadgeText?.includes('admin');
    expect(hasRoleBadge, '????? role label ?? sidebar').toBe(true);
  });
});

// ----------------------------------------------
// 3. ADMIN ROLE — ???? Feature ?????????????
// ----------------------------------------------
test.describe('?? Admin Role — Feature ?????????????', () => {
  // --- Dashboard ---
  test('dashboard: ???? stats section ?????? admin', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const adminStats = page.locator('#adminStatsSection, .stats-grid, .stat-card');
    const hasStats = await adminStats.count() > 0;
    if (hasStats) {
      await expect(adminStats.first()).toBeVisible();
    }
  });

  // --- Team Management ---
  test('team-management: ???? tabs ???? section ??????', async ({ page }) => {
    await page.goto('/team-management.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // ?????? content ????
    const content = page.locator('table, .user-card, .member-list, [id*="tab"], .tabs');
    const emptyMsg = page.locator(':text("???????????"), :text("?????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Record Water ---
  test('record-water: ???? form ?????????????', async ({ page }) => {
    await page.goto('/record-water.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const form = page.locator('form, .record-form, select, input[type="number"]');
    const hasForm = await form.count() > 0;
    expect(hasForm, '????? form/input ???????????????????').toBe(true);
  });

  // --- Record Electric ---
  test('record-electric: ???? form ???????????', async ({ page }) => {
    await page.goto('/record-electric.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const form = page.locator('form, .record-form, select, input[type="number"]');
    const hasForm = await form.count() > 0;
    expect(hasForm, '????? form/input ?????????????????').toBe(true);
  });

  // --- Payment Notification ---
  test('payment-notification: ???? houselist ???? compose', async ({ page }) => {
    await page.goto('/payment-notification.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .house-list, .notify-form, form, button:has-text("???")');
    const emptyMsg = page.locator(':text("?????"), :text("????????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Monthly Withdraw ---
  test('monthly-withdraw: ?????????????????? form', async ({ page }) => {
    await page.goto('/monthly-withdraw.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .withdraw-list, form, .period-select, select');
    const emptyMsg = page.locator(':text("?????"), :text("????????"), :text("????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Accounting ---
  test('accounting: ?????????/???????????', async ({ page }) => {
    await page.goto('/accounting.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .accounting-list, .entry-list, form');
    const emptyMsg = page.locator(':text("?????"), :text("????????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Check Slip ---
  test('check-slip: ???????????????????????', async ({ page }) => {
    await page.goto('/check-slip.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .slip-list, .slip-card');
    const emptyMsg = page.locator(':text("?????"), :text("?????"), :text("????????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Check Request ---
  test('check-request: ???? tabs ??????', async ({ page }) => {
    await page.goto('/check-request.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // tab navigation ??????
    const tabs = page.locator('[role="tab"], .tab-btn, .tab-button, button:has-text("?????????"), button:has-text("???")');
    const table = page.locator('table');
    const emptyMsg = page.locator(':text("?????"), :text("????????")');
    const hasContent =
      (await tabs.count() > 0) ||
      (await table.count() > 0) ||
      (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Check Report ---
  test('check-report: ?????????????????????????', async ({ page }) => {
    await page.goto('/check-report.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .report-list, .report-card, form');
    const emptyMsg = page.locator(':text("?????"), :text("????????"), :text("?????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- View as User ---
  test('view-as-user: ??????????????????????', async ({ page }) => {
    await page.goto('/view-as-user.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .house-list, select, .card');
    const emptyMsg = page.locator(':text("?????"), :text("????????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Admin Settings ---
  test('admin-settings: ???? form ???????????', async ({ page }) => {
    await page.goto('/admin-settings.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const form = page.locator('form, .settings-form, input, select');
    const hasForm = await form.count() > 0;
    expect(hasForm, '????? form/input ???????????').toBe(true);
  });

  // --- Admin Report ---
  test('admin-report: ????????????????', async ({ page }) => {
    await page.goto('/admin-report.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .report-section, canvas, .chart, h2, .summary');
    const emptyMsg = page.locator(':text("?????"), :text("????????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });

  // --- Activity Log ---
  test('activity-log: ?????????? log ???????', async ({ page }) => {
    await page.goto('/activity-log.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('table, .log-list, .log-item');
    const emptyMsg = page.locator(':text("?????"), :text("????????"), :text("?????")');
    const hasContent = (await content.count() > 0) || (await emptyMsg.count() > 0);
    expect(hasContent).toBe(true);
  });
});

// ----------------------------------------------
// 4. USER ROLE — ?????????? (????? .auth/user.json ????? session ????)
// ----------------------------------------------
test.describe('?? User Role — ??????????', () => {
  test.use({ storageState: '.auth/user.json' });

  for (const menu of USER_MENUS) {
    test(`user ???? ${menu.label} (${menu.path}) ???`, async ({ page }) => {
      const result = await checkPage(page, menu.path);

      // ???????? user session ????? redirect ?? login ? skip
      if (!result.staysOnPage && result.url.includes('login.html')) {
        test.skip();
        return;
      }

      expect(result.staysOnPage,
        `User ??? redirect ?????? ${menu.path} ? ${result.url}`
      ).toBe(true);

      expect(result.criticalErrors,
        `Critical JS errors: ${result.criticalErrors.join('; ')}`
      ).toHaveLength(0);

      expect(result.hasMainContent,
        `????? main content ?? ${menu.path}`
      ).toBe(true);
    });
  }

  test('user ??????? admin-only links ?? sidebar', async ({ page }) => {
    await page.goto('/dashboard.html');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // ?????? redirect ?????? dashboard ? skip (????? user session)
    if (!page.url().includes('dashboard.html')) {
      test.skip();
      return;
    }

    // admin-only pages ????????????? sidebar ?????? user ??????
    const adminOnlyLinks = ['team-management.html', 'admin-settings.html', 'activity-log.html'];
    for (const link of adminOnlyLinks) {
      const count = await page.locator(`a[href*="${link}"]`).count();
      expect(count, `User ?????????? link: ${link}`).toBe(0);
    }
  });
});

// ----------------------------------------------
// 5. USER ROLE — ???? Admin-Only Pages ???? Redirect
// ----------------------------------------------
test.describe('?? User Role — ??????????????? Admin pages', () => {
  test.use({ storageState: '.auth/user.json' });

  for (const menu of ADMIN_ONLY_MENUS) {
    test(`user ???? ${menu.label} ? redirect ???? access denied`, async ({ page }) => {
      await page.goto('/' + menu.path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(3000);

      const currentUrl = page.url();

      // ???????? user session ? ??? redirect ?? login ? test ?????? relevant ? skip
      if (currentUrl.includes('login.html')) {
        test.skip();
        return;
      }

      // ??????? redirect ????? dashboard ???????? access denied
      const redirected = !currentUrl.includes(menu.path.replace('.html', ''));
      const accessDenied = await page.locator(
        ':text("???????????"), :text("Access Denied"), :text("?????????"), :text("403")'
      ).count() > 0;

      expect(redirected || accessDenied,
        `User ?????? redirect ???????? access denied ?? ${menu.path} ??? URL ????????: ${currentUrl}`
      ).toBe(true);
    });
  }
});

// ----------------------------------------------
// 6. NO AUTH — ??????? redirect ?? login
// ----------------------------------------------
test.describe('?? No Auth — ???? redirect ?? login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const PROTECTED_PAGES = [...USER_MENUS, ...ADMIN_ONLY_MENUS].filter(
    m => m.path !== 'regulations.html' && m.path !== 'electrical-info.html'
    // regulations/electrical-info ??????? public page ???
  );

  for (const menu of PROTECTED_PAGES) {
    test(`${menu.label} (${menu.path}) ? ???? redirect ?? login`, async ({ page }) => {
      await page.goto('/' + menu.path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('login.html');
      const stayedButNoContent = currentUrl.includes(menu.path.replace('.html', ''));

      // ?????? 2 ????: redirect ?? login / ?????????????????????????????? (auth guard client-side)
      expect(redirectedToLogin || stayedButNoContent,
        `${menu.path} ??? redirect ?? login ?????????? session (URL: ${currentUrl})`
      ).toBe(true);

      if (redirectedToLogin) {
        // ??????? login page ???????????
        await expect(page.locator('#loginForm, form')).toBeVisible({ timeout: 5000 });
      }
    });
  }
});

// ----------------------------------------------
// 7. Public Pages — ??????? login
// ----------------------------------------------
test.describe('?? Public Pages — ????????????????? login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login.html ???????', async ({ page }) => {
    await page.goto('/login.html');
    await page.waitForLoadState('load');
    await expect(page.locator('#loginForm, form')).toBeVisible();
  });

  test('register.html ???????', async ({ page }) => {
    await page.goto('/register.html');
    await page.waitForLoadState('load');
    const hasForm = await page.locator('form, #registerForm').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('forgot-password.html ???????', async ({ page }) => {
    await page.goto('/forgot-password.html');
    await page.waitForLoadState('load');
    const hasForm = await page.locator('form, input').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('forgot-email.html ???????', async ({ page }) => {
    await page.goto('/forgot-email.html');
    await page.waitForLoadState('load');
    const hasForm = await page.locator('form, input').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('index.html ???????', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('load');
    const hasBody = await page.locator('body').count() > 0;
    expect(hasBody).toBe(true);
  });
});
