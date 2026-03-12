/**
 * HOME PPK 2026 — Navigation v4.0
 * Bottom Tab Bar + Slide-up Menu (no sidebar)
 * Works the same on Desktop and Mobile
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
  var isAdmin = role === 'admin';
  var lastName = user.lastname || '';
  var firstName = user.firstname || '';
  var displayName = (firstName + ' ' + lastName).trim() || '\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49';

  if (!activePage) {
    activePage = (window.location.pathname.split('/').pop() || 'dashboard.html')
      .replace('.html', '');
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Bottom tab items (4 main + more)
  var bottomItems = [
    { page: 'dashboard', icon: '\ud83c\udfe0', label: '\u0e2b\u0e19\u0e49\u0e32\u0e2b\u0e25\u0e31\u0e01' },
    { page: 'payment-history', icon: '\ud83d\udcb3', label: '\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19' },
    { page: 'form', icon: '\ud83d\udcdd', label: '\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07' }
  ];
  if (isAdmin) {
    bottomItems.push({ page: 'team-management', icon: '\ud83d\udc65', label: '\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23' });
  } else {
    bottomItems.push({ page: 'settings', icon: '\u2699\ufe0f', label: '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32' });
  }

  // Build bottom nav
  var html = '<nav class="ppk-bottom-nav" id="ppkBottomNav">';
  bottomItems.forEach(function(b) {
    var active = activePage === b.page ? ' active' : '';
    html += '<button class="ppk-bottom-btn' + active + '" onclick="navigate(\'?page=' + b.page + '\')">';
    html += '<div class="ppk-bottom-icon-wrap"><span class="ppk-bottom-icon">' + b.icon + '</span></div>';
    html += '<span class="ppk-bottom-label">' + _esc(b.label) + '</span>';
    html += '</button>';
  });
  html += '<button class="ppk-bottom-btn" onclick="toggleMobileMenu()">';
  html += '<div class="ppk-bottom-icon-wrap"><span class="ppk-bottom-icon">\u2630</span></div>';
  html += '<span class="ppk-bottom-label">\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21</span></button>';
  html += '</nav>';

  // Slide-up full menu
  var allItems = [
    { page: 'dashboard', icon: '\ud83c\udfe0', label: '\u0e41\u0e14\u0e0a\u0e1a\u0e2d\u0e23\u0e4c\u0e14' },
    { page: 'payment-history', icon: '\ud83d\udcb3', label: '\u0e1b\u0e23\u0e30\u0e27\u0e31\u0e15\u0e34\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30' },
    { page: 'form', icon: '\ud83d\udcdd', label: '\u0e22\u0e37\u0e48\u0e19\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07' },
    { page: 'regulations', icon: '\ud83d\udcd6', label: '\u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a' },
    { page: 'settings', icon: '\u2699\ufe0f', label: '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27' }
  ];
  if (isAdmin) {
    allItems.push(
      { page: 'team-management', icon: '\ud83d\udc65', label: '\u0e28\u0e39\u0e19\u0e22\u0e4c\u0e04\u0e27\u0e1a\u0e04\u0e38\u0e21' },
      { page: 'record-water', icon: '\ud83d\udca7', label: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e48\u0e32\u0e19\u0e49\u0e33' },
      { page: 'record-electric', icon: '\u26a1', label: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e04\u0e48\u0e32\u0e44\u0e1f' },
      { page: 'payment-notification', icon: '\ud83d\udce2', label: '\u0e41\u0e08\u0e49\u0e07\u0e22\u0e2d\u0e14\u0e0a\u0e33\u0e23\u0e30' },
      { page: 'check-slip', icon: '\ud83d\udd0d', label: '\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e25\u0e34\u0e1b' },
      { page: 'check-request', icon: '\ud83d\udccb', label: '\u0e15\u0e23\u0e27\u0e08\u0e04\u0e33\u0e23\u0e49\u0e2d\u0e07' },
      { page: 'accounting', icon: '\ud83d\udcca', label: '\u0e1a\u0e31\u0e0d\u0e0a\u0e35' },
      { page: 'monthly-withdraw', icon: '\ud83d\udcb5', label: '\u0e40\u0e1a\u0e34\u0e01\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e40\u0e14\u0e37\u0e2d\u0e19' },
      { page: 'admin-settings', icon: '\ud83d\udd27', label: '\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32\u0e41\u0e2d\u0e14\u0e21\u0e34\u0e19' }
    );
  }

  html += '<div class="ppk-mobile-overlay" id="ppkMobileOverlay" onclick="closeMobileMenu()"></div>';
  html += '<div class="ppk-mobile-menu" id="ppkMobileMenu">';
  html += '<div class="ppk-mobile-menu-handle"></div>';
  html += '<div class="ppk-mobile-menu-header">';
  html += '<span class="ppk-mobile-menu-title">\u0e40\u0e21\u0e19\u0e39\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14</span>';
  html += '<button class="ppk-mobile-menu-close" onclick="closeMobileMenu()">\u2715</button></div>';
  html += '<div class="ppk-mobile-menu-user">\ud83d\udc64 ' + _esc(displayName);
  if (user.houseNumber) html += ' \u2014 \u0e1a\u0e49\u0e32\u0e19 ' + _esc(user.houseNumber);
  if (isAdmin) html += ' <span class="ppk-badge ppk-badge-primary" style="margin-left:0.5rem">\u0e41\u0e2d\u0e14\u0e21\u0e34\u0e19</span>';
  html += '</div>';
  html += '<div class="ppk-mobile-menu-grid">';

  allItems.forEach(function(item) {
    var active = activePage === item.page ? ' active' : '';
    html += '<button class="ppk-mobile-menu-item' + active + '" onclick="closeMobileMenu();navigate(\'?page=' + item.page + '\')">';
    html += '<span class="ppk-mobile-menu-item-icon">' + item.icon + '</span>';
    html += '<span class="ppk-mobile-menu-item-label">' + _esc(item.label) + '</span>';
    html += '</button>';
  });

  html += '</div>';
  html += '<div class="ppk-mobile-menu-footer">';
  html += '<button class="ppk-mobile-menu-logout" onclick="closeMobileMenu();doLogout()">\ud83d\udeaa \u0e2d\u0e2d\u0e01\u0e08\u0e32\u0e01\u0e23\u0e30\u0e1a\u0e1a</button>';
  html += '</div></div>';

  container.innerHTML = html;

  // Inject compat CSS for legacy pages
  if (!document.getElementById('_ppk_nav_css')) {
    var s = document.createElement('style');
    s.id = '_ppk_nav_css';
    s.textContent = '.sidebar{display:none!important;}\n.dashboard-container,.main-container,.ppk-main{animation:ppk-fadein .35s ease-out;}';
    document.head.appendChild(s);
  }

  // Load admin badge counts
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
        _badge('badge-pending-reg', d.pendingRegistrations || 0);
        _badge('badge-pending-slips', d.pendingSlips || 0);
        _badge('badge-pending-reqs', d.pendingRequests || 0);
      }).catch(function () {});
    }, 1500);
  }
}

// Mobile Menu Functions
window.toggleMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu = document.getElementById('ppkMobileMenu');
  if (!overlay || !menu) return;
  overlay.classList.add('show');
  requestAnimationFrame(function () { menu.classList.add('show'); });
};

window.closeMobileMenu = function () {
  var overlay = document.getElementById('ppkMobileOverlay');
  var menu = document.getElementById('ppkMobileMenu');
  if (!menu) return;
  menu.classList.remove('show');
  setTimeout(function () { if (overlay) overlay.classList.remove('show'); }, 300);
};

// Logout helper
if (typeof window.doLogout === 'undefined') {
  window.doLogout = function () {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    window.location.replace('login.html');
  };
}

// Auto-render
(function () {
  var nav = document.getElementById('ppkNav');
  if (!nav || nav.hasChildNodes()) return;
  var page = window._ppkNavPage ||
    (window.location.pathname.split('/').pop() || 'dashboard.html').replace('.html', '');
  try { renderPPKNav('ppkNav', page); } catch (e) {}
})();