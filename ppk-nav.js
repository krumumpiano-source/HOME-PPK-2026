/**
 * HOME PPK 2026 — Navigation Renderer
 * ดัดแปลงจากรูปแบบ Band Management By SoulCiety (nav.js)
 *
 * renderPPKNav(containerId, activePage)
 *   containerId : id ของ <div> ที่จะ inject sidebar เข้าไป (default: 'ppkNav')
 *   activePage  : ชื่อหน้าปัจจุบัน เช่น 'dashboard', 'payment-history', ...
 *
 * ใช้ class names เดิมของโปรเจค (sidebar, sidebar-link, ...) ครบ
 * เพื่อให้ CSS inline ของแต่ละหน้ายังทำงานได้ตามเดิม
 */

function renderPPKNav(containerId, activePage) {
  var container = document.getElementById(containerId || 'ppkNav');
  if (!container) return;

  // ── ดึงข้อมูล user / role จาก localStorage ──────────────────────
  var user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) {}
  var role     = user.role || 'user';
  var isAdmin  = role === 'admin';
  var lastName = user.lastname  || '';
  var firstName= user.firstname || '';
  var displayName = (firstName + ' ' + lastName).trim() || 'ผู้ใช้';

  // ── ตรวจหน้าปัจจุบัน (fallback จาก URL) ──────────────────────────
  if (!activePage) {
    activePage = (window.location.pathname.split('/').pop() || 'dashboard.html')
      .replace('.html', '');
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function navBtn(page, icon, label, extraStyle, badgeId) {
    var isActive = activePage === page ? ' active' : '';
    var st = extraStyle ? ' style="' + extraStyle + '"' : '';
    var badge = badgeId
      ? '<span id="' + badgeId + '" class="ppk-nav-badge" style="display:none"></span>'
      : '';
    return (
      '<button class="sidebar-link' + isActive + '" ' +
        'onclick="navigate(\'?page=' + page + '\')"' + st + ' style="position:relative">' +
        '<span class="sidebar-link-icon">' + icon + '</span>' +
        '<span class="sidebar-label">' + _esc(label) + '</span>' +
        badge +
      '</button>'
    );
  }

  // ── รายการเมนูสมาชิกทั่วไป ──────────────────────────────────────
  var memberMenu =
    navBtn('dashboard',       '🏠', 'แดชบอร์ด') +
    navBtn('payment-history', '💸', 'ข้อมูลการชำระย้อนหลัง') +
    navBtn('form',            '📝', 'แบบฟอร์มคำร้อง') +
    navBtn('regulations',     '📚', 'ระเบียบ') +
    navBtn('settings',        '⚙️', 'ตั้งค่าส่วนตัว');

  // ── รายการเมนูแอดมิน ─────────────────────────────────────────────
  var adminMenu = isAdmin ? (
    navBtn('team-management',      '👥', 'โปรแกรมบริหารจัดการ', null, 'badge-pending-reg') +
    navBtn('record-water',         '💧', 'บันทึกมิเตอร์น้ำ') +
    navBtn('record-electric',      '⚡', 'บันทึกมิเตอร์ไฟ') +
    navBtn('payment-notification', '📢', 'แจ้งยอดชำระ') +
    navBtn('check-slip',           '🔍', 'ตรวจสลิป', null, 'badge-pending-slips') +
    navBtn('check-request',        '📋', 'ตรวจคำร้อง', null, 'badge-pending-reqs') +
    navBtn('accounting',           '📊', 'บัญชี') +
    navBtn('monthly-withdraw',     '💵', 'เบิกประจำเดือน') +
    navBtn('admin-settings',       '🔧', 'ตั้งค่าแอดมิน')
  ) : (
    navBtn('team-management', '👥', 'โปรแกรมบริหารจัดการ')
  );

  // ── ปุ่ม logout — ซ่อนไว้เนื่องจากไม่ใช้ระบบ login ────────────────
var logoutBtn = ''; // ไม่แสดงปุ่ม logout

  // ── user info badge ───────────────────────────────────────────────
  var userBadge = displayName
    ? '<div class="sidebar-user-badge">' + _esc(displayName) +
      (user.houseNumber ? ' — บ้าน ' + _esc(user.houseNumber) : '') +
      '</div>'
    : '';

  // ── Inject sidebar HTML ──────────────────────────────────────────
  container.innerHTML =
    '<div class="sidebar" id="sidebar">' +
      '<button class="sidebar-toggle" id="sidebarToggle" title="ขยาย/ย่อเมนู">☰</button>' +
      (userBadge ? '<div class="sidebar-user-info">' + userBadge + '</div>' : '') +
      '<nav class="sidebar-menu">' +
        memberMenu +
        adminMenu +
        logoutBtn +
      '</nav>' +
    '</div>';

  // ── Inject user badge CSS ─────────────────────────────────────────
  if (!document.getElementById('_ppk_nav_css')) {
    var s = document.createElement('style');
    s.id = '_ppk_nav_css';
    s.textContent = [
      '.sidebar-user-info{',
        'padding:0.5rem 0.6rem 0.7rem;',
        'border-bottom:1px solid rgba(255,255,255,0.15);',
        'margin-bottom:0.4rem;',
      '}',
      '.sidebar-user-badge{',
        'color:rgba(255,255,255,0.78);',
        'font-size:0.82rem;',
        'line-height:1.4;',
        'display:none;',
        'word-break:break-word;',
      '}',
      '.sidebar.expanded .sidebar-user-badge{display:block;}',
      '.ppk-nav-badge{',
        'position:absolute;top:6px;right:6px;',
        'background:#ef4444;color:#fff;',
        'border-radius:999px;',
        'font-size:10px;font-weight:700;',
        'min-width:16px;height:16px;',
        'padding:0 4px;',
        'line-height:16px;text-align:center;',
        'font-family:sans-serif;',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  // ── โหลด badge counts แบบ async (admin เท่านั้น) ─────────────────
  if (isAdmin && typeof callBackend === 'function') {
    setTimeout(function () {
      callBackend('getDashboardData', {}).then(function (r) {
        if (!r || !r.success || r.role !== 'admin') return;
        var d = r.data || {};
        function _badge(id, count) {
          var el = document.getElementById(id);
          if (!el) return;
          if (count > 0) { el.textContent = count > 99 ? '99+' : String(count); el.style.display = ''; }
          else el.style.display = 'none';
        }
        _badge('badge-pending-reg',   d.pendingRegistrations || 0);
        _badge('badge-pending-slips', d.pendingSlips || 0);
        _badge('badge-pending-reqs',  d.pendingRequests || 0);
      }).catch(function () {});
    }, 1500);
  }

  // ── Setup sidebar toggle ─────────────────────────────────────────
  var sidebar       = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  if (!sidebar || !sidebarToggle) return;

  // หาตัว container content หลัก
  function getMain() {
    return (
      document.getElementById('dashboardContainer') ||
      document.getElementById('mainContainer') ||
      document.querySelector('.dashboard-container') ||
      document.querySelector('main')
    );
  }

  function updateMargin() {
    var main = getMain();
    if (!main) return;
    var expanded = sidebar.classList.contains('expanded');
    var isMobile = window.innerWidth <= 600;
    main.style.marginLeft = expanded
      ? (isMobile ? '160px' : '280px')
      : (isMobile ? '48px'  : '62px');
  }

  // set initial margin
  updateMargin();

  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('expanded');
    updateMargin();
  });

  window.addEventListener('resize', updateMargin);
}

// ── doLogout helper (ปิดการออกจากระบบ — ไม่ใช้ระบบ login) ────────────
if (typeof window.doLogout === 'undefined') {
  window.doLogout = function () {
    window.location.replace('dashboard.html');
  };
}

// ── Auto-render: เรียก renderPPKNav อัตโนมัติเมื่อ ppk-nav.js โหลด ──────
// แก้ปัญหา script order: inline scripts เรียก renderPPKNav ก่อน ppk-nav.js โหลด
(function () {
  var nav = document.getElementById('ppkNav');
  if (!nav || nav.hasChildNodes()) return;
  // ตรวจ page hint จาก inline script, fallback จาก URL
  var page = window._ppkNavPage ||
    (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
  try { renderPPKNav('ppkNav', page); } catch (e) {}
})();
