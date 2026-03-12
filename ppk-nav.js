/**
 * HOME PPK 2026 — Navigation v3.0
 * Clean Design System (uses ppk-theme.css)
 */

function renderPPKNav(containerId, activePage) {
  var container = document.getElementById(containerId || 'ppkNav');
  if (!container) return;

  // ── Inject theme CSS if not present ──
  if (!document.getElementById('_ppk_theme_css')) {
    var link = document.createElement('link');
    link.id = '_ppk_theme_css';
    link.rel = 'stylesheet';
    link.href = 'ppk-theme.css';
    document.head.appendChild(link);
  }

  // ── User data ──
  var user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) {}
  var role      = user.role || 'user';
  var isAdmin   = role === 'admin';
  var lastName  = user.lastname  || '';
  var firstName = user.firstname || '';
  var displayName = (firstName + ' ' + lastName).trim() || 'ผู้ใช้';

  if (!activePage) {
    activePage = (window.location.pathname.split('/').pop() || 'dashboard.html')
      .replace('.html', '');
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Menu definition ──
  var menus = [
    { section: 'หน้าหลัก' },
    { page: 'dashboard', icon: '🏠', label: 'แดชบอร์ด' },
    { section: 'ผู้พักอาศัย' },
    { page: 'payment-history', icon: '💳', label: 'ประวัติการชำระ' },
    { page: 'form',            icon: '📝', label: 'ยื่นคำร้อง' },
    { page: 'regulations',     icon: '📖', label: 'ระเบียบ' },
    { page: 'settings',        icon: '⚙️', label: 'ตั้งค่าส่วนตัว' }
  ];
  if (isAdmin) {
    menus.push(
      { section: 'บริหารจัดการ' },
      { page: 'team-management',      icon: '👥', label: 'ศูนย์ควบคุม',   badgeId: 'badge-pending-reg' },
      { page: 'record-water',         icon: '💧', label: 'บันทึกค่าน้ำ' },
      { page: 'record-electric',      icon: '⚡', label: 'บันทึกค่าไฟ' },
      { page: 'payment-notification', icon: '📢', label: 'แจ้งยอดชำระ' },
      { page: 'check-slip',           icon: '🔍', label: 'ตรวจสลิป',     badgeId: 'badge-pending-slips' },
      { page: 'check-request',        icon: '📋', label: 'ตรวจคำร้อง',   badgeId: 'badge-pending-reqs' },
      { section: 'การเงิน' },
      { page: 'accounting',       icon: '📊', label: 'บัญชีรายรับรายจ่าย' },
      { page: 'monthly-withdraw', icon: '💵', label: 'เบิกประจำเดือน' },
      { section: 'ระบบ' },
      { page: 'admin-settings', icon: '🔧', label: 'ตั้งค่าแอดมิน' }
    );
  }

  // ── Build sidebar HTML ──
  var sidebarHTML = '';
  sidebarHTML += '<div class="ppk-sidebar" id="ppkSidebar">';
  sidebarHTML += '<div class="ppk-sidebar-header">';
  sidebarHTML += '<div class="ppk-sidebar-logo">🏠</div>';
  sidebarHTML += '<span class="ppk-sidebar-brand">HOME PPK</span>';
  sidebarHTML += '</div>';
  sidebarHTML += '<button class="ppk-sidebar-toggle" id="ppkSidebarToggle" title="ขยาย/ย่อ">‹</button>';
  sidebarHTML += '<nav class="ppk-nav">';

  menus.forEach(function(m) {
    if (m.section) {
      sidebarHTML += '<div class="ppk-nav-section">' + _esc(m.section) + '</div>';
      return;
    }
    var active = activePage === m.page ? ' active' : '';
    var badge = m.badgeId
      ? '<span id="' + m.badgeId + '" class="ppk-nav-badge" style="display:none"></span>'
      : '';
    sidebarHTML += '<button class="ppk-nav-item' + active + '" data-tip="' + _esc(m.label) + '" onclick="navigate(\'?page=' + m.page + '\')">';
    sidebarHTML += '<span class="ppk-nav-icon">' + m.icon + '</span>';
    sidebarHTML += '<span class="ppk-nav-label">' + _esc(m.label) + '</span>';
    sidebarHTML += badge;
    sidebarHTML += '</button>';
  });

  sidebarHTML += '</nav>';
  // User area
  var initials = (firstName.charAt(0) + lastName.charAt(0)).trim() || '👤';
  sidebarHTML += '<div class="ppk-sidebar-user">';
  sidebarHTML += '<div class="ppk-sidebar-avatar">' + _esc(initials) + '</div>';
  sidebarHTML += '<div class="ppk-sidebar-user-info">';
  sidebarHTML += '<div class="ppk-sidebar-user-name">' + _esc(displayName) + '</div>';
  sidebarHTML += '<div class="ppk-sidebar-user-role">' + (isAdmin ? '🛡️ แอดมิน' : '👤 ผู้พักอาศัย') + '</div>';
  sidebarHTML += '</div></div>';
  sidebarHTML += '</div>';

  // ── Bottom nav (mobile) ──
  var bottomItems = [
    { page: 'dashboard', icon: '🏠', label: 'หน้าหลัก' },
    { page: 'payment-history', icon: '💳', label: 'ชำระเงิน' },
    { page: 'form', icon: '📝', label: 'คำร้อง' }
  ];
  if (isAdmin) {
    bottomItems.push({ page: 'team-management', icon: '👥', label: 'จัดการ' });
  } else {
    bottomItems.push({ page: 'regulations', icon: '📖', label: 'ระเบียบ' });
  }

  var bottomHTML = '<nav class="ppk-bottom-nav" id="ppkBottomNav">';
  bottomItems.forEach(function(b) {
    var active = activePage === b.page ? ' active' : '';
    bottomHTML += '<button class="ppk-bottom-btn' + active + '" onclick="navigate(\'?page=' + b.page + '\')">';
    bottomHTML += '<div class="ppk-bottom-icon-bg"><span class="ppk-bottom-icon">' + b.icon + '</span></div>';
    bottomHTML += '<span class="ppk-bottom-label">' + _esc(b.label) + '</span>';
    bottomHTML += '</button>';
  });
  bottomHTML += '<button class="ppk-bottom-btn" onclick="toggleMobileMenu()">';
  bottomHTML += '<div class="ppk-bottom-icon-bg"><span class="ppk-bottom-icon">☰</span></div>';
  bottomHTML += '<span class="ppk-bottom-label">เพิ่มเติม</span></button>';
  bottomHTML += '</nav>';

  // ── Mobile slide-up menu ──
  var mobileHTML = '<div class="ppk-mobile-overlay" id="ppkMobileOverlay" onclick="closeMobileMenu()"></div>';
  mobileHTML += '<div class="ppk-mobile-menu" id="ppkMobileMenu">';
  mobileHTML += '<div class="ppk-mobile-menu-header">';
  mobileHTML += '<span class="ppk-mobile-menu-title">เมนูทั้งหมด</span>';
  mobileHTML += '<button class="ppk-mobile-menu-close" onclick="closeMobileMenu()">✕</button></div>';
  mobileHTML += '<div class="ppk-mobile-menu-user">👤 ' + _esc(displayName);
  if (user.houseNumber) mobileHTML += ' — บ้าน ' + _esc(user.houseNumber);
  if (isAdmin) mobileHTML += ' <span class="ppk-badge ppk-badge-primary" style="margin-left:0.5rem">แอดมิน</span>';
  mobileHTML += '</div>';
  mobileHTML += '<div class="ppk-mobile-menu-grid">';

  var allItems = [
    { page: 'dashboard', icon: '🏠', label: 'แดชบอร์ด' },
    { page: 'payment-history', icon: '💳', label: 'ประวัติการชำระ' },
    { page: 'form', icon: '📝', label: 'ยื่นคำร้อง' },
    { page: 'regulations', icon: '📖', label: 'ระเบียบ' },
    { page: 'settings', icon: '⚙️', label: 'ตั้งค่าส่วนตัว' }
  ];
  if (isAdmin) {
    allItems.push(
      { page: 'team-management', icon: '👥', label: 'ศูนย์ควบคุม' },
      { page: 'record-water', icon: '💧', label: 'บันทึกค่าน้ำ' },
      { page: 'record-electric', icon: '⚡', label: 'บันทึกค่าไฟ' },
      { page: 'payment-notification', icon: '📢', label: 'แจ้งยอดชำระ' },
      { page: 'check-slip', icon: '🔍', label: 'ตรวจสลิป' },
      { page: 'check-request', icon: '📋', label: 'ตรวจคำร้อง' },
      { page: 'accounting', icon: '📊', label: 'บัญชี' },
      { page: 'monthly-withdraw', icon: '💵', label: 'เบิก' },
      { page: 'admin-settings', icon: '🔧', label: 'ตั้งค่าแอดมิน' }
    );
  }

  allItems.forEach(function(item) {
    var active = activePage === item.page ? ' active' : '';
    mobileHTML += '<button class="ppk-mobile-menu-item' + active + '" onclick="closeMobileMenu();navigate(\'?page=' + item.page + '\')">';
    mobileHTML += '<span class="ppk-mobile-menu-item-icon">' + item.icon + '</span>';
    mobileHTML += '<span class="ppk-mobile-menu-item-label">' + _esc(item.label) + '</span>';
    mobileHTML += '</button>';
  });

  mobileHTML += '</div></div>';

  // ── Render all ──
  container.innerHTML = sidebarHTML + bottomHTML + mobileHTML;

  // ── Inject minimal compat CSS (for legacy pages that use old sidebar classes) ──
  if (!document.getElementById('_ppk_nav_css')) {
    var s = document.createElement('style');
    s.id = '_ppk_nav_css';
    s.textContent = [
      '/* Legacy compat — hides old sidebar references */',
      '.sidebar{display:none !important;}',
      '.dashboard-container,.main-container{animation:ppk-fadein 0.35s ease-out;}',
      '@keyframes ppk-fadein{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Sidebar toggle ──
  var sidebar = document.getElementById('ppkSidebar');
  var toggle  = document.getElementById('ppkSidebarToggle');
  if (!sidebar || !toggle) return;

  // Restore state
  var saved = localStorage.getItem('ppk_sidebar_open');
  if (saved === 'true') sidebar.classList.add('open');

  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    localStorage.setItem('ppk_sidebar_open', sidebar.classList.contains('open'));
    toggle.textContent = sidebar.classList.contains('open') ? '‹' : '›';
    updateMainMargin();
  });
  toggle.textContent = sidebar.classList.contains('open') ? '‹' : '›';

  function getMain() {
    return document.getElementById('dashboardContainer') ||
           document.getElementById('mainContainer') ||
           document.querySelector('.dashboard-container') ||
           document.querySelector('.ppk-main') ||
           document.querySelector('main');
  }

  function updateMainMargin() {
    var main = getMain();
    if (!main || window.innerWidth <= 768) {
      if (main) main.style.marginLeft = '0';
      return;
    }
    main.style.marginLeft = sidebar.classList.contains('open') ? 'var(--sidebar-w-open)' : 'var(--sidebar-w)';
    main.style.transition = 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  updateMainMargin();
  window.addEventListener('resize', updateMainMargin);

  // ── Load admin badge counts ──
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
}

// ── Mobile Menu Functions ──
window.toggleMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu    = document.getElementById('ppkMobileMenu');
  if (!overlay || !menu) return;
  overlay.classList.add('show');
  requestAnimationFrame(function () { menu.classList.add('show'); });
};

window.closeMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu    = document.getElementById('ppkMobileMenu');
  if (!menu) return;
  menu.classList.remove('show');
  setTimeout(function () { if (overlay) overlay.classList.remove('show'); }, 300);
};

// ── Logout helper ──
if (typeof window.doLogout === 'undefined') {
  window.doLogout = function () { window.location.replace('dashboard.html'); };
}

// ── Auto-render ──
(function () {
  var nav = document.getElementById('ppkNav');
  if (!nav || nav.hasChildNodes()) return;
  var page = window._ppkNavPage ||
    (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
  try { renderPPKNav('ppkNav', page); } catch (e) {}
})();