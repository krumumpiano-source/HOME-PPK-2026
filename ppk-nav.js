/**
 * HOME PPK 2026 — Navigation v5.0
 * Sidebar (Desktop) + Topbar Hamburger & Drawer (Mobile)
 * Inspired by BandThai nav pattern
 */

function renderPPKNav(containerId, activePage) {
  var container = document.getElementById(containerId || 'ppkNav');
  if (!container) return;

  // Inject theme CSS if not present
  if (!document.getElementById('_ppk_theme_css')) {
    var link = document.createElement('link');
    link.id = '_ppk_theme_css';
    link.rel = 'stylesheet';
    link.href = 'ppk-theme.css';
    document.head.appendChild(link);
  }

  // User data
  var user = {};
  try { user = JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch (e) {}
  var role = user.role || 'user';
  var isAdmin = role === 'admin' || role === 'head';
  var lastName = user.lastname || '';
  var firstName = user.firstname || '';
  var displayName = (firstName + ' ' + lastName).trim() || '\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49';
  var houseNumber = user.houseNumber || '';

  if (!activePage) {
    activePage = (window.location.pathname.split('/').pop() || 'dashboard.html')
      .replace('.html', '');
  }

  function _esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function navLink(page, icon, label, desc) {
    var isActive = activePage === page ? ' active' : '';
    return '<li><a href="' + page + '.html" class="nav-link' + isActive + '" onclick="navigate(\'?page=' + page + '\');return false;">' +
      icon + ' ' + label +
      (desc ? '<span class="nav-link-desc">' + desc + '</span>' : '') +
      '</a></li>';
  }

  function navSection(label) {
    return '<li class="nav-section-title">' + label + '</li>';
  }

  var userPerms = user.permissions || [];
  function _hasPerm(p) { return userPerms.indexOf(p) >= 0; }
  var hasAnyPerm = isAdmin || userPerms.length > 0;

  // Role label
  var roleLabel = isAdmin
    ? (role === 'head' ? '\ud83d\udc51 \u0e2b\u0e31\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e07\u0e32\u0e19' : '\ud83d\udd27 \u0e04\u0e13\u0e30\u0e17\u0e33\u0e07\u0e32\u0e19')
    : hasAnyPerm ? '\ud83d\udccc \u0e04\u0e13\u0e30\u0e17\u0e33\u0e07\u0e32\u0e19'
    : '\ud83c\udfe0 \u0e1c\u0e39\u0e49\u0e1e\u0e31\u0e01\u0e2d\u0e32\u0e28\u0e31\u0e22';
  var houseBadge = houseNumber
    ? '<div class="sidebar-user-house">\u0e1a\u0e49\u0e32\u0e19 ' + _esc(houseNumber) + '</div>'
    : '';

  // Resident menu items
  var residentLinks =
    navSection('\ud83c\udfe0 \u0e1c\u0e39\u0e49\u0e1e\u0e31\u0e01\u0e2d\u0e32\u0e28\u0e31\u0e22') +
    navLink('dashboard',       '\ud83d\udcca', '\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14',       '\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e41\u0e25\u0e30\u0e17\u0e32\u0e07\u0e25\u0e31\u0e14') +
    navLink('payment-history', '\ud83d\udcb3', '\u0e1b\u0e23\u0e30\u0e27\u0e31\u0e15\u0e34\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30', '\u0e22\u0e2d\u0e14\u0e04\u0e49\u0e32\u0e07\u0e0a\u0e33\u0e23\u0e30\u0e41\u0e25\u0e30\u0e2a\u0e25\u0e34\u0e1b') +
    navLink('upload-slip',     '\ud83d\udcf7', '\u0e2a\u0e48\u0e07\u0e2a\u0e25\u0e34\u0e1b',           '\u0e2a\u0e48\u0e07\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e01\u0e32\u0e23\u0e42\u0e2d\u0e19\u0e40\u0e07\u0e34\u0e19') +
    navLink('form',            '\ud83d\udcdd', '\u0e22\u0e37\u0e48\u0e19\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07',      '\u0e41\u0e08\u0e49\u0e07\u0e0b\u0e48\u0e2d\u0e21 \u0e02\u0e2d\u0e22\u0e49\u0e32\u0e22 \u0e43\u0e1a\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07\u0e15\u0e48\u0e32\u0e07\u0e46') +
    navLink('regulations',     '\ud83d\udcd6', '\u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a\u0e1a\u0e49\u0e32\u0e19\u0e1e\u0e31\u0e01',  '\u0e01\u0e0e\u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a\u0e41\u0e25\u0e30\u0e02\u0e49\u0e2d\u0e1b\u0e0f\u0e34\u0e1a\u0e31\u0e15\u0e34') +
    navLink('settings',        '\u2699\ufe0f', '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27',  '\u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25 \u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e23\u0e2b\u0e31\u0e2a\u0e1c\u0e48\u0e32\u0e19');

  // Admin menu items — แสดงตามสิทธิ์ (permissions) หรือ role
  var adminLinks = '';
  if (hasAnyPerm) {
    adminLinks = navSection('\ud83d\udd27 \u0e04\u0e13\u0e30\u0e17\u0e33\u0e07\u0e32\u0e19');
    if (isAdmin) adminLinks += navLink('team-management', '\ud83d\udc65', '\u0e28\u0e39\u0e19\u0e22\u0e4c\u0e04\u0e27\u0e1a\u0e04\u0e38\u0e21', '\u0e2a\u0e21\u0e32\u0e0a\u0e34\u0e01\u0e41\u0e25\u0e30\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07');
    if (isAdmin || _hasPerm('water')) adminLinks += navLink('record-water', '\ud83d\udca7', '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33', '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e21\u0e34\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e19\u0e49\u0e33\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19');
    if (isAdmin || _hasPerm('electric')) adminLinks += navLink('record-electric', '\u26a1', '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e48\u0e32\u0e44\u0e1f', '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e44\u0e1f\u0e1f\u0e49\u0e32\u0e23\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19');
    if (isAdmin || _hasPerm('notify')) adminLinks += navLink('payment-notification', '\ud83d\udce2', '\u0e41\u0e08\u0e49\u0e07\u0e22\u0e2d\u0e14\u0e0a\u0e33\u0e23\u0e30', '\u0e2a\u0e48\u0e07\u0e43\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e04\u0e48\u0e32\u0e2a\u0e32\u0e18\u0e32\u0e23\u0e13\u0e39\u0e1b\u0e42\u0e20\u0e04');
    if (isAdmin || _hasPerm('slip')) adminLinks += navLink('check-slip', '\ud83d\udd0d', '\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e25\u0e34\u0e1b', '\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a\u0e2a\u0e25\u0e34\u0e1b\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30');
    if (isAdmin || _hasPerm('request')) adminLinks += navLink('check-request', '\ud83d\udccb', '\u0e15\u0e23\u0e27\u0e08\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07', '\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34\u0e43\u0e1a\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07\u0e15\u0e48\u0e32\u0e07\u0e46');
    if (isAdmin || _hasPerm('accounting')) adminLinks += navLink('accounting', '\ud83d\udcca', '\u0e1a\u0e31\u0e0d\u0e0a\u0e35', '\u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22\u0e1a\u0e49\u0e32\u0e19\u0e1e\u0e31\u0e01\u0e04\u0e23\u0e39');
    if (isAdmin || _hasPerm('withdraw')) adminLinks += navLink('monthly-withdraw', '\ud83d\udcb5', '\u0e40\u0e1a\u0e34\u0e01\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e40\u0e14\u0e37\u0e2d\u0e19', '\u0e2a\u0e23\u0e38\u0e1b\u0e22\u0e2d\u0e14\u0e40\u0e1a\u0e34\u0e01\u0e08\u0e48\u0e32\u0e22');
    if (isAdmin) adminLinks += navLink('admin-settings', '\ud83d\udd27', '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e41\u0e2d\u0e14\u0e21\u0e34\u0e19', '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e23\u0e30\u0e1a\u0e1a LINE \u0e2d\u0e35\u0e40\u0e21\u0e25');
  }

  container.innerHTML =
    /* Topbar (mobile only) */
    '<header class="nav-topbar">' +
      '<button class="nav-hamburger" id="navHamburger" aria-label="\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e21\u0e19\u0e39" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
      '</button>' +
      '<a href="dashboard.html" class="nav-topbar-brand" onclick="navigate(\'?page=dashboard\');return false;">\ud83c\udfe0 HOME PPK 2026</a>' +
      '<div class="nav-topbar-right">' +
        '<span class="nav-user-name">' + _esc(displayName) + '</span>' +
      '</div>' +
    '</header>' +

    /* Backdrop */
    '<div class="nav-backdrop" id="navBackdrop"></div>' +

    /* Sidebar */
    '<aside class="nav-sidebar" id="navSidebar" aria-label="\u0e40\u0e21\u0e19\u0e39\u0e2b\u0e25\u0e31\u0e01">' +
      '<div class="sidebar-header">' +
        '<a href="dashboard.html" class="sidebar-brand" onclick="navigate(\'?page=dashboard\');return false;">\ud83c\udfe0 HOME PPK 2026</a>' +
        '<button class="sidebar-close" id="navClose" aria-label="\u0e1b\u0e34\u0e14\u0e40\u0e21\u0e19\u0e39">\u2715</button>' +
      '</div>' +
      '<div class="sidebar-user">' +
        '<div class="sidebar-avatar">\ud83d\udc64</div>' +
        '<div class="sidebar-user-info">' +
          '<div class="sidebar-user-name">' + _esc(displayName) + '</div>' +
          houseBadge +
          '<div class="sidebar-user-role">' + roleLabel + '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="sidebar-nav">' +
        '<ul class="nav-menu">' +
          residentLinks +
          adminLinks +
        '</ul>' +
      '</nav>' +
      '<div class="sidebar-footer">' +
        '<a href="login.html" class="nav-logout" onclick="doLogout();return true;">\ud83d\udeaa \u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a</a>' +
      '</div>' +
    '</aside>';

  // Toggle logic
  var hamburger = document.getElementById('navHamburger');
  var sidebar   = document.getElementById('navSidebar');
  var backdrop  = document.getElementById('navBackdrop');
  var closeBtn  = document.getElementById('navClose');

  function navOpen() {
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function navClose() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (hamburger) hamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    sidebar.classList.contains('open') ? navClose() : navOpen();
  });
  if (closeBtn)  closeBtn.addEventListener('click', navClose);
  if (backdrop)  backdrop.addEventListener('click', navClose);

  // Close sidebar on link click (mobile)
  if (sidebar) sidebar.querySelectorAll('a.nav-link').forEach(function(a) {
    a.addEventListener('click', function() {
      if (window.innerWidth < 1024) navClose();
    });
  });

  // Keyboard: Escape key closes
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') navClose();
  });

  // Inject compat CSS for legacy pages
  if (!document.getElementById('_ppk_nav_css')) {
    var s = document.createElement('style');
    s.id = '_ppk_nav_css';
    s.textContent = '.sidebar:not(.nav-sidebar){display:none!important;}\n.dashboard-container,.main-container,.ppk-main{animation:ppk-fadein .35s ease-out;}';
    document.head.appendChild(s);
  }

  // Load admin badge counts
  if (hasAnyPerm && typeof callBackend === 'function') {
    setTimeout(function () {
      callBackend('getDashboardData', {}).then(function (r) {
        if (!r || !r.success || (r.role !== 'admin' && r.role !== 'head')) return;
        var d = r.data || {};
        function _badge(selector, count) {
          // Find sidebar link and add badge
          if (count <= 0) return;
          var links = sidebar.querySelectorAll('a.nav-link');
          links.forEach(function(link) {
            if (link.href && link.href.indexOf(selector) !== -1) {
              var badge = document.createElement('span');
              badge.className = 'nav-badge';
              badge.textContent = count > 99 ? '99+' : String(count);
              link.appendChild(badge);
            }
          });
        }
        _badge('admin-settings', d.pendingRegistrations || 0);
        _badge('check-slip', d.pendingSlips || 0);
        _badge('check-request', d.pendingRequests || 0);
      }).catch(function () {});
    }, 1500);
  }
}

// Logout helper
if (typeof window.doLogout === 'undefined') {
  window.doLogout = function () {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    window.location.replace('login.html');
  };
}

// Keep legacy toggleMobileMenu and closeMobileMenu as no-ops
window.toggleMobileMenu = function() {};
window.closeMobileMenu = function() {};

// Auto-render
(function () {
  var nav = document.getElementById('ppkNav');
  if (!nav || nav.hasChildNodes()) return;
  var page = window._ppkNavPage ||
    (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
  try { renderPPKNav('ppkNav', page); } catch (e) { console.error('PPK Nav error:', e); }
})();