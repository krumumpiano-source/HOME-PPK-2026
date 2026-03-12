/**
 * HOME PPK 2026 — Navigation Renderer v2.0
 * ปรับปรุง UX: Tooltip, Mobile Bottom Nav, Better Active States, Scroll
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
        'onclick="navigate(\'?page=' + page + '\')" data-tooltip="' + _esc(label) + '"' + st + '>' +
        '<span class="sidebar-link-icon">' + icon + '</span>' +
        '<span class="sidebar-label">' + _esc(label) + '</span>' +
        badge +
      '</button>'
    );
  }

  // Mobile bottom nav button
  function mobileBtn(page, icon, label) {
    var isActive = activePage === page ? ' active' : '';
    return (
      '<button class="ppk-bottom-btn' + isActive + '" onclick="navigate(\'?page=' + page + '\')">' +
        '<span class="ppk-bottom-icon">' + icon + '</span>' +
        '<span class="ppk-bottom-label">' + _esc(label) + '</span>' +
      '</button>'
    );
  }

  function sectionDivider(icon, label) {
    return '<div class="sidebar-divider">' +
      '<span class="sidebar-divider-icon">' + icon + '</span>' +
      '<span class="sidebar-divider-label">' + _esc(label) + '</span>' +
    '</div>';
  }

  // ── รายการเมนู — จัดกลุ่มเป็นหมวดหมู่ ──────────────────────────
  var menuHTML = '';

  menuHTML += sectionDivider('📌', 'หน้าหลัก');
  menuHTML += navBtn('dashboard', '🏠', 'แดชบอร์ด');

  menuHTML += sectionDivider('👤', 'ผู้พักอาศัย');
  menuHTML += navBtn('payment-history', '💸', 'ประวัติการชำระ');
  menuHTML += navBtn('form',            '📝', 'ยื่นคำร้อง');
  menuHTML += navBtn('regulations',     '📚', 'ระเบียบ');
  menuHTML += navBtn('settings',        '⚙️', 'ตั้งค่าส่วนตัว');

  if (isAdmin) {
    menuHTML += sectionDivider('🛠️', 'บริหารจัดการ');
    menuHTML += navBtn('team-management',      '👥', 'ศูนย์ควบคุม', null, 'badge-pending-reg');
    menuHTML += navBtn('record-water',         '💧', 'บันทึกค่าน้ำ');
    menuHTML += navBtn('record-electric',      '⚡', 'บันทึกค่าไฟ');
    menuHTML += navBtn('payment-notification', '📢', 'แจ้งยอดชำระ');
    menuHTML += navBtn('check-slip',           '🔍', 'ตรวจสลิป', null, 'badge-pending-slips');
    menuHTML += navBtn('check-request',        '📋', 'ตรวจคำร้อง', null, 'badge-pending-reqs');

    menuHTML += sectionDivider('💰', 'การเงิน');
    menuHTML += navBtn('accounting',       '📊', 'บัญชีรายรับรายจ่าย');
    menuHTML += navBtn('monthly-withdraw', '💵', 'เบิกประจำเดือน');

    menuHTML += sectionDivider('⚙️', 'ระบบ');
    menuHTML += navBtn('admin-settings', '🔧', 'ตั้งค่าแอดมิน');
  }

  // ── user info badge ───────────────────────────────────────────────
  var userBadge = displayName
    ? '<div class="sidebar-user-badge">' + _esc(displayName) +
      (user.houseNumber ? ' — บ้าน ' + _esc(user.houseNumber) : '') +
      '</div>'
    : '';

  // ── Mobile bottom navigation ───────────────────────────────────────
  var mobileNavHTML = '<nav class="ppk-bottom-nav" id="ppkBottomNav">';
  mobileNavHTML += mobileBtn('dashboard', '🏠', 'หน้าหลัก');
  mobileNavHTML += mobileBtn('payment-history', '💸', 'ชำระเงิน');
  mobileNavHTML += mobileBtn('form', '📝', 'คำร้อง');
  if (isAdmin) {
    mobileNavHTML += mobileBtn('team-management', '👥', 'จัดการ');
    mobileNavHTML += mobileBtn('check-slip', '🔍', 'ตรวจสลิป');
  } else {
    mobileNavHTML += mobileBtn('regulations', '📚', 'ระเบียบ');
  }
  mobileNavHTML += '<button class="ppk-bottom-btn ppk-bottom-more" onclick="toggleMobileMenu()">' +
    '<span class="ppk-bottom-icon">☰</span><span class="ppk-bottom-label">เพิ่มเติม</span></button>';
  mobileNavHTML += '</nav>';

  // ── Mobile slide-up menu ───────────────────────────────────────────
  var mobileMenuHTML = '<div class="ppk-mobile-overlay" id="ppkMobileOverlay" onclick="closeMobileMenu()"></div>';
  mobileMenuHTML += '<div class="ppk-mobile-menu" id="ppkMobileMenu">';
  mobileMenuHTML += '<div class="ppk-mobile-menu-header">';
  mobileMenuHTML += '<span class="ppk-mobile-menu-title">📋 เมนูทั้งหมด</span>';
  mobileMenuHTML += '<button class="ppk-mobile-menu-close" onclick="closeMobileMenu()">✕</button>';
  mobileMenuHTML += '</div>';
  mobileMenuHTML += '<div class="ppk-mobile-menu-user">👤 ' + _esc(displayName);
  if (user.houseNumber) mobileMenuHTML += ' — บ้าน ' + _esc(user.houseNumber);
  if (isAdmin) mobileMenuHTML += ' <span class="ppk-role-badge">แอดมิน</span>';
  mobileMenuHTML += '</div>';
  mobileMenuHTML += '<div class="ppk-mobile-menu-grid">';

  // All menu items for mobile menu
  var mobileItems = [
    { page: 'dashboard', icon: '🏠', label: 'แดชบอร์ด' },
    { page: 'payment-history', icon: '💸', label: 'ประวัติการชำระ' },
    { page: 'form', icon: '📝', label: 'ยื่นคำร้อง' },
    { page: 'regulations', icon: '📚', label: 'ระเบียบ' },
    { page: 'settings', icon: '⚙️', label: 'ตั้งค่าส่วนตัว' }
  ];
  if (isAdmin) {
    mobileItems.push(
      { page: 'team-management', icon: '👥', label: 'ศูนย์ควบคุม' },
      { page: 'record-water', icon: '💧', label: 'บันทึกค่าน้ำ' },
      { page: 'record-electric', icon: '⚡', label: 'บันทึกค่าไฟ' },
      { page: 'payment-notification', icon: '📢', label: 'แจ้งยอดชำระ' },
      { page: 'check-slip', icon: '🔍', label: 'ตรวจสลิป' },
      { page: 'check-request', icon: '📋', label: 'ตรวจคำร้อง' },
      { page: 'accounting', icon: '📊', label: 'บัญชี' },
      { page: 'monthly-withdraw', icon: '💵', label: 'เบิกประจำเดือน' },
      { page: 'admin-settings', icon: '🔧', label: 'ตั้งค่าแอดมิน' }
    );
  }

  mobileItems.forEach(function(item) {
    var isActive = activePage === item.page ? ' active' : '';
    mobileMenuHTML += '<button class="ppk-mobile-menu-item' + isActive + '" onclick="closeMobileMenu();navigate(\'?page=' + item.page + '\')">' +
      '<span class="ppk-mobile-menu-icon">' + item.icon + '</span>' +
      '<span class="ppk-mobile-menu-label">' + _esc(item.label) + '</span>' +
    '</button>';
  });

  mobileMenuHTML += '</div></div>';

  // ── Inject sidebar HTML ──────────────────────────────────────────
  container.innerHTML =
    '<div class="sidebar" id="sidebar">' +
      '<button class="sidebar-toggle" id="sidebarToggle" title="ขยาย/ย่อเมนู">☰</button>' +
      (userBadge ? '<div class="sidebar-user-info">' + userBadge + '</div>' : '') +
      '<nav class="sidebar-menu">' +
        menuHTML +
      '</nav>' +
    '</div>' +
    mobileNavHTML +
    mobileMenuHTML;

  // ── Inject comprehensive CSS ─────────────────────────────────────
  if (!document.getElementById('_ppk_nav_css')) {
    var s = document.createElement('style');
    s.id = '_ppk_nav_css';
    s.textContent = [
      /* User info */
      '.sidebar-user-info{padding:0.5rem 0.6rem 0.7rem;border-bottom:1px solid rgba(255,255,255,0.15);margin-bottom:0.4rem;}',
      '.sidebar-user-badge{color:rgba(255,255,255,0.78);font-size:0.82rem;line-height:1.4;display:none;word-break:break-word;}',
      '.sidebar.expanded .sidebar-user-badge{display:block;}',

      /* Section dividers */
      '.sidebar-divider{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.5rem 0.25rem;margin-top:0.4rem;border-top:1px solid rgba(255,255,255,0.12);pointer-events:none;}',
      '.sidebar-divider:first-child{border-top:none;margin-top:0;}',
      '.sidebar-divider-icon{font-size:0.85rem;min-width:1.5em;text-align:center;opacity:0.7;}',
      '.sidebar-divider-label{display:none;font-size:0.72rem;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}',
      '.sidebar.expanded .sidebar-divider-label{display:inline;}',

      /* Nav badges */
      '.ppk-nav-badge{position:absolute;top:4px;right:4px;background:#ef4444;color:#fff;border-radius:999px;font-size:10px;font-weight:700;min-width:16px;height:16px;padding:0 4px;line-height:16px;text-align:center;font-family:sans-serif;z-index:2;animation:ppk-badge-pulse 2s infinite;}',
      '@keyframes ppk-badge-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}',

      /* Active indicator bar */
      '.sidebar-link{position:relative;}',
      '.sidebar-link.active::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:60%;background:#fff;border-radius:0 3px 3px 0;}',
      '.sidebar.expanded .sidebar-link.active::before{background:#2563eb;}',

      /* ★ Tooltip for collapsed sidebar */
      '.sidebar:not(.expanded) .sidebar-link[data-tooltip]{position:relative;}',
      '.sidebar:not(.expanded) .sidebar-link[data-tooltip]::after{' +
        'content:attr(data-tooltip);position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%);' +
        'background:#1e293b;color:#f8fafc;padding:0.4rem 0.75rem;border-radius:8px;font-size:0.85rem;' +
        'white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:9999;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:"Kanit",sans-serif;}',
      '.sidebar:not(.expanded) .sidebar-link[data-tooltip]:hover::after{opacity:1;}',
      /* Tooltip arrow */
      '.sidebar:not(.expanded) .sidebar-link[data-tooltip]::before{' +
        'content:"";position:absolute;left:calc(100% + 2px);top:50%;transform:translateY(-50%);' +
        'border:5px solid transparent;border-right-color:#1e293b;' +
        'pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:9999;}',
      '.sidebar:not(.expanded) .sidebar-link[data-tooltip]:hover::before{opacity:1;}',

      /* Sidebar scrollable */
      '.sidebar-menu{overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.2) transparent;}',
      '.sidebar-menu::-webkit-scrollbar{width:3px;}',
      '.sidebar-menu::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:2px;}',

      /* ═══ Mobile Bottom Navigation ═══ */
      '.ppk-bottom-nav{display:none;}',
      '@media(max-width:768px){',
        /* Hide sidebar on mobile */
        '.sidebar{display:none !important;}',
        /* Remove sidebar margin from main content */
        '.dashboard-container,.main-container,main,[class*="container"]{margin-left:0 !important;padding-bottom:80px !important;}',
        /* Bottom nav bar */
        '.ppk-bottom-nav{' +
          'display:flex;position:fixed;bottom:0;left:0;right:0;z-index:1000;' +
          'background:#fff;border-top:1px solid #e5e7eb;padding:0.2rem 0.3rem;' +
          'padding-bottom:max(0.2rem,env(safe-area-inset-bottom));' +
          'box-shadow:0 -2px 12px rgba(0,0,0,0.08);justify-content:space-around;align-items:center;}',
        '.ppk-bottom-btn{' +
          'display:flex;flex-direction:column;align-items:center;gap:0.1rem;' +
          'background:none;border:none;padding:0.35rem 0.4rem;border-radius:8px;' +
          'font-family:inherit;cursor:pointer;color:#64748b;transition:all 0.15s;min-width:0;flex:1;}',
        '.ppk-bottom-btn.active{color:#2563eb;background:rgba(37,99,235,0.08);}',
        '.ppk-bottom-btn:hover{color:#2563eb;}',
        '.ppk-bottom-icon{font-size:1.3rem;line-height:1;}',
        '.ppk-bottom-label{font-size:0.65rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60px;}',
      '}',

      /* ═══ Mobile Slide-up Menu ═══ */
      '.ppk-mobile-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1001;opacity:0;transition:opacity 0.25s;}',
      '.ppk-mobile-overlay.show{display:block;opacity:1;}',
      '.ppk-mobile-menu{' +
        'position:fixed;bottom:0;left:0;right:0;z-index:1002;' +
        'background:#fff;border-radius:20px 20px 0 0;' +
        'padding:0 0 max(1rem,env(safe-area-inset-bottom));' +
        'transform:translateY(100%);transition:transform 0.3s cubic-bezier(0.32,0.72,0,1);' +
        'max-height:85vh;overflow-y:auto;box-shadow:0 -8px 32px rgba(0,0,0,0.15);}',
      '.ppk-mobile-menu.show{transform:translateY(0);}',
      '.ppk-mobile-menu-header{' +
        'display:flex;align-items:center;justify-content:space-between;' +
        'padding:1rem 1.2rem 0.5rem;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;border-radius:20px 20px 0 0;z-index:1;}',
      '.ppk-mobile-menu-title{font-size:1.1rem;font-weight:700;color:#0f172a;}',
      '.ppk-mobile-menu-close{background:none;border:none;font-size:1.3rem;color:#64748b;cursor:pointer;padding:0.3rem;border-radius:8px;}',
      '.ppk-mobile-menu-close:hover{background:#f1f5f9;}',
      '.ppk-mobile-menu-user{' +
        'padding:0.75rem 1.2rem;background:linear-gradient(135deg,#eff6ff,#e0e7ff);' +
        'font-size:0.9rem;color:#1e40af;font-weight:500;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}',
      '.ppk-role-badge{background:#2563eb;color:#fff;font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:99px;font-weight:700;}',
      '.ppk-mobile-menu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;padding:1rem;}',
      '.ppk-mobile-menu-item{' +
        'display:flex;flex-direction:column;align-items:center;gap:0.4rem;' +
        'padding:0.9rem 0.4rem;border-radius:12px;border:1px solid #e5e7eb;' +
        'background:#fff;cursor:pointer;font-family:inherit;transition:all 0.15s;}',
      '.ppk-mobile-menu-item:hover,.ppk-mobile-menu-item:active{background:#eff6ff;border-color:#93c5fd;}',
      '.ppk-mobile-menu-item.active{background:#eff6ff;border-color:#2563eb;box-shadow:0 0 0 1px #2563eb;}',
      '.ppk-mobile-menu-icon{font-size:1.6rem;}',
      '.ppk-mobile-menu-label{font-size:0.75rem;color:#374151;text-align:center;line-height:1.3;word-break:keep-all;}',
      '.ppk-mobile-menu-item.active .ppk-mobile-menu-label{color:#2563eb;font-weight:600;}',

      /* ═══ Global Loading Spinner ═══ */
      '.ppk-loading{display:flex;flex-direction:column;align-items:center;gap:0.75rem;padding:2rem;}',
      '.ppk-spinner{width:36px;height:36px;border:3px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:ppk-spin 0.7s linear infinite;}',
      '@keyframes ppk-spin{to{transform:rotate(360deg)}}',
      '.ppk-loading-text{color:#64748b;font-size:0.9rem;}',

      /* ═══ Page transition ═══ */
      '.dashboard-container,.main-container{animation:ppk-fadein 0.3s ease-out;}',
      '@keyframes ppk-fadein{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}',

      /* ═══ Better back button ═══ */
      '.ppk-back-btn{' +
        'display:inline-flex;align-items:center;gap:0.4rem;padding:0.5rem 1rem;' +
        'border-radius:10px;border:1px solid #e5e7eb;background:#fff;' +
        'font:inherit;font-weight:600;font-size:0.9rem;cursor:pointer;color:#374151;' +
        'transition:all 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.05);}',
      '.ppk-back-btn:hover{background:#f8fafc;border-color:#93c5fd;color:#2563eb;}',

      /* ═══ Desktop: keep sidebar ═══ */
      '@media(min-width:769px){.ppk-bottom-nav,.ppk-mobile-overlay,.ppk-mobile-menu{display:none !important;}}',
    ].join('\n');
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

  // ── Setup sidebar toggle (desktop only) ──────────────────────────
  var sidebar       = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  if (!sidebar || !sidebarToggle) return;

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
    // On mobile, sidebar is hidden via CSS
    if (window.innerWidth <= 768) {
      main.style.marginLeft = '0';
      return;
    }
    var expanded = sidebar.classList.contains('expanded');
    main.style.marginLeft = expanded ? '280px' : '62px';
  }

  updateMargin();

  sidebarToggle.addEventListener('click', function () {
    sidebar.classList.toggle('expanded');
    updateMargin();
  });

  window.addEventListener('resize', updateMargin);
}

// ── Mobile Menu Toggle Functions ────────────────────────────────────
window.toggleMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu = document.getElementById('ppkMobileMenu');
  if (!overlay || !menu) return;
  overlay.classList.add('show');
  // Small delay for smooth animation
  requestAnimationFrame(function () {
    menu.classList.add('show');
  });
};

window.closeMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu = document.getElementById('ppkMobileMenu');
  if (!menu) return;
  menu.classList.remove('show');
  setTimeout(function () {
    if (overlay) overlay.classList.remove('show');
  }, 300);
};

// ── doLogout helper ────────────────────────────────────────────────
if (typeof window.doLogout === 'undefined') {
  window.doLogout = function () {
    window.location.replace('dashboard.html');
  };
}

// ── Auto-render ────────────────────────────────────────────────────
(function () {
  var nav = document.getElementById('ppkNav');
  if (!nav || nav.hasChildNodes()) return;
  var page = window._ppkNavPage ||
    (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
  try { renderPPKNav('ppkNav', page); } catch (e) {}
})();