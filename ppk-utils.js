/**
 * PPK Utils — Beautiful Modal Dialogs
 * แทนที่ confirm() และ alert() ของ Browser ด้วย Modal สวยๆ
 */

/* ══════════════════════════════════════════════════════════════
   callBackend / callBackendGet / cachedCall — Stubs
   กำหนดที่นี่ถ้า ppk-app.js เก่าไม่ได้กำหนดไว้
   โดย poll รอ window._callBackendReal (set โดย ppk-api.js)
══════════════════════════════════════════════════════════════ */
(function () {
    function _makeApiStub() {
        return function (action, data) {
            return new Promise(function (resolve, reject) {
                var tries = 0;
                var t = setInterval(function () {
                    tries++;
                    if (typeof window._callBackendReal === 'function') {
                        clearInterval(t);
                        window._callBackendReal(action, data || {}).then(resolve).catch(reject);
                    } else if (tries > 200) {
                        clearInterval(t);
                        reject(new Error('PPK API โหลดไม่สำเร็จ กรุณารีเฟรชหน้า'));
                    }
                }, 100);
            });
        };
    }
    if (typeof window.callBackend    !== 'function') window.callBackend    = _makeApiStub();
    if (typeof window.callBackendGet !== 'function') window.callBackendGet = _makeApiStub();
    if (typeof window.cachedCall     !== 'function') window.cachedCall     = function (a, d) {
        return new Promise(function (resolve, reject) {
            var tries = 0;
            var t = setInterval(function () {
                tries++;
                if (typeof window._cachedCallReal === 'function') {
                    clearInterval(t);
                    window._cachedCallReal(a, d || {}).then(resolve).catch(reject);
                } else if (tries > 200) {
                    clearInterval(t);
                    reject(new Error('PPK API โหลดไม่สำเร็จ กรุณารีเฟรชหน้า'));
                }
            }, 100);
        });
    };
})();

(function () {
  /* ──────────────────────────────────────────
     Inject CSS
  ────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#ppk-overlay{',
      'position:fixed;inset:0;',
      'background:rgba(15,23,42,0.55);',
      'display:flex;align-items:center;justify-content:center;',
      'z-index:99999;',
      'opacity:0;transition:opacity .22s ease;',
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'padding:16px;',
    '}',
    '#ppk-overlay.ppk-show{opacity:1;}',

    '#ppk-box{',
      'background:#fff;',
      'border-radius:20px;',
      'padding:36px 32px 28px;',
      'max-width:440px;width:100%;',
      'box-shadow:0 24px 64px rgba(0,0,0,.22),0 4px 16px rgba(0,0,0,.12);',
      'transform:scale(.88) translateY(-24px);',
      'transition:transform .25s cubic-bezier(.34,1.56,.64,1);',
      'font-family:"Sarabun","Kanit",sans-serif;',
      'text-align:center;',
    '}',
    '#ppk-overlay.ppk-show #ppk-box{transform:scale(1) translateY(0);}',

    '#ppk-icon-wrap{',
      'width:72px;height:72px;',
      'border-radius:50%;',
      'display:flex;align-items:center;justify-content:center;',
      'margin:0 auto 18px;',
      'font-size:34px;',
    '}',
    '#ppk-icon-wrap.ppk-type-confirm{background:#eff6ff;}',
    '#ppk-icon-wrap.ppk-type-danger{background:#fef2f2;}',
    '#ppk-icon-wrap.ppk-type-success{background:#f0fdf4;}',
    '#ppk-icon-wrap.ppk-type-error{background:#fef2f2;}',
    '#ppk-icon-wrap.ppk-type-info{background:#f0f9ff;}',
    '#ppk-icon-wrap.ppk-type-warning{background:#fffbeb;}',

    '#ppk-title{',
      'font-size:19px;font-weight:700;',
      'color:#0f172a;margin-bottom:10px;line-height:1.35;',
    '}',
    '#ppk-msg{',
      'font-size:15px;color:#475569;',
      'white-space:pre-line;line-height:1.75;',
      'margin-bottom:28px;',
    '}',

    '#ppk-btns{display:flex;gap:10px;justify-content:center;}',

    '.ppk-btn{',
      'flex:1;max-width:160px;',
      'padding:11px 20px;',
      'border-radius:12px;',
      'font-size:15px;font-weight:600;',
      'font-family:inherit;cursor:pointer;',
      'border:none;transition:all .15s;',
      'letter-spacing:.01em;',
    '}',
    '.ppk-btn-cancel{',
      'background:#f1f5f9;color:#64748b;',
      'border:2px solid #e2e8f0;',
    '}',
    '.ppk-btn-cancel:hover{background:#e2e8f0;color:#334155;}',

    '.ppk-btn-ok{background:#3b82f6;color:#fff;}',
    '.ppk-btn-ok:hover{background:#2563eb;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,.35);}',
    '.ppk-btn-ok:active{transform:translateY(0);}',
    '.ppk-btn-ok.ppk-danger{background:#ef4444;}',
    '.ppk-btn-ok.ppk-danger:hover{background:#dc2626;box-shadow:0 4px 12px rgba(239,68,68,.35);}',
    '.ppk-btn-ok.ppk-success{background:#22c55e;}',
    '.ppk-btn-ok.ppk-success:hover{background:#16a34a;box-shadow:0 4px 12px rgba(34,197,94,.35);}',
    '.ppk-btn-ok.ppk-warning{background:#f59e0b;}',
    '.ppk-btn-ok.ppk-warning:hover{background:#d97706;}',
  ].join('');
  document.head.appendChild(style);

  /* ──────────────────────────────────────────
     State
  ────────────────────────────────────────── */
  var _resolve = null;

  /* ──────────────────────────────────────────
     Helpers
  ────────────────────────────────────────── */
  function _close(result) {
    var overlay = document.getElementById('ppk-overlay');
    if (!overlay) return;
    overlay.classList.remove('ppk-show');
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 250);
    if (_resolve) { _resolve(result); _resolve = null; }
  }

  function _detectType(message) {
    if (/ลบ|ล้าง|ยกเลิก|กู้คืน|reset|clear|delete|remove/i.test(message)) return 'danger';
    if (/ผิดพลาด|error|ล้มเหลว|ไม่สามารถ|ไม่ได้/i.test(message)) return 'error';
    if (/เรียบร้อย|สำเร็จ|บันทึก|อัปเดต|เพิ่ม|ส่ง/i.test(message)) return 'success';
    if (/คำเตือน|ระวัง|⚠️|warning/i.test(message)) return 'warning';
    return 'confirm';
  }

  var ICONS = {
    confirm: '❓',
    danger:  '⚠️',
    error:   '❌',
    success: '✅',
    info:    'ℹ️',
    warning: '⚠️',
  };

  var TITLES = {
    confirm: 'ยืนยัน',
    danger:  'ยืนยันการดำเนินการ',
    error:   'เกิดข้อผิดพลาด',
    success: 'สำเร็จ',
    info:    'แจ้งเตือน',
    warning: 'คำเตือน',
  };

  function _build(message, opts, showCancel) {
    var type = opts.type || _detectType(message);
    var icon = opts.icon || ICONS[type] || 'ℹ️';
    var title = opts.title || TITLES[type] || 'แจ้งเตือน';

    var overlay = document.createElement('div');
    overlay.id = 'ppk-overlay';
    overlay.innerHTML =
      '<div id="ppk-box">' +
        '<div id="ppk-icon-wrap" class="ppk-type-' + type + '">' + icon + '</div>' +
        '<div id="ppk-title">' + _escape(title) + '</div>' +
        '<div id="ppk-msg">' + _escape(message) + '</div>' +
        '<div id="ppk-btns">' +
          (showCancel
            ? '<button class="ppk-btn ppk-btn-cancel" id="ppk-cancel">' + (opts.cancelText || 'ยกเลิก') + '</button>'
            : '') +
          '<button class="ppk-btn ppk-btn-ok' +
            (type === 'danger' || type === 'error' ? ' ppk-danger' : '') +
            (type === 'success' ? ' ppk-success' : '') +
            (type === 'warning' ? ' ppk-warning' : '') +
            '" id="ppk-ok">' + (opts.okText || (showCancel ? 'ยืนยัน' : 'ตกลง')) + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#ppk-ok').addEventListener('click', function () { _close(true); });
    var cancelBtn = overlay.querySelector('#ppk-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function () { _close(false); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) _close(false); });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('ppk-show'); });
    });
  }

  function _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ──────────────────────────────────────────
     ESC / Enter keyboard
  ────────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (!document.getElementById('ppk-overlay')) return;
    if (e.key === 'Escape') _close(false);
    if (e.key === 'Enter') _close(true);
  });

  /* ──────────────────────────────────────────
     Public API
  ────────────────────────────────────────── */

  /**
   * ppkConfirm(message, opts?) → Promise<boolean>
   * แทนที่ confirm() — ต้องใช้ await
   */
  window.ppkConfirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      _resolve = resolve;
      _build(message, opts, true);
    });
  };

  /**
   * ppkAlert(message, opts?) → Promise<void>
   * แทนที่ alert() — ใช้ได้ทั้ง await หรือ fire-and-forget
   */
  window.ppkAlert = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      _resolve = resolve;
      _build(message, opts, false);
    });
  };

})();

/* ══════════════════════════════════════════════════════════
   PPK TOAST — การแจ้งเตือนแบบ non-blocking (ไม่ blocking)
   ppkToast(message, type?, durationMs?)
   type: 'success' | 'error' | 'warning' | 'info'
══════════════════════════════════════════════════════════ */
(function () {
  var _container = null;

  function _ensureContainer() {
    if (_container && document.body.contains(_container)) return _container;
    _container = document.createElement('div');
    _container.id = 'ppk-toast-container';
    _container.style.cssText = [
      'position:fixed;',
      'top:16px;right:16px;',
      'z-index:999999;',
      'display:flex;flex-direction:column;gap:8px;',
      'pointer-events:none;',
      'max-width:340px;width:calc(100vw - 32px);',
    ].join('');
    document.body.appendChild(_container);
    return _container;
  }

  var TOAST_COLORS = {
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '✅', text: '#166534' },
    error:   { bg: '#fef2f2', border: '#ef4444', icon: '❌', text: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️', text: '#92400e' },
    info:    { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️', text: '#1e40af' },
  };

  window.ppkToast = function (message, type, durationMs) {
    type = type || 'success';
    durationMs = durationMs != null ? durationMs : 3500;
    var c = TOAST_COLORS[type] || TOAST_COLORS.info;
    var container = _ensureContainer();

    var toast = document.createElement('div');
    toast.style.cssText = [
      'background:' + c.bg + ';',
      'border-left:4px solid ' + c.border + ';',
      'border-radius:10px;',
      'padding:12px 16px;',
      'display:flex;align-items:flex-start;gap:10px;',
      'box-shadow:0 4px 16px rgba(0,0,0,.12);',
      'font-family:"Kanit","Sarabun",sans-serif;',
      'font-size:14px;line-height:1.5;',
      'color:' + c.text + ';',
      'pointer-events:auto;',
      'opacity:0;transform:translateX(40px);',
      'transition:opacity .25s ease,transform .25s ease;',
    ].join('');
    toast.innerHTML =
      '<span style="font-size:18px;flex-shrink:0;margin-top:-1px">' + c.icon + '</span>' +
      '<span style="flex:1">' + String(message).replace(/</g, '&lt;') + '</span>' +
      '<button onclick="this.parentNode.remove()" style="background:none;border:none;cursor:pointer;color:' + c.text + ';font-size:16px;flex-shrink:0;padding:0;opacity:.6">✕</button>';

    container.appendChild(toast);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
      });
    });

    if (durationMs > 0) {
      setTimeout(function () {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, durationMs);
    }
    return toast;
  };
})();

/* ══════════════════════════════════════════════════════════
   PPK LOADING — Overlay loading indicator
   ppkLoading(show, message?)
══════════════════════════════════════════════════════════ */
(function () {
  var _el = null;

  window.ppkLoading = function (show, message) {
    if (show) {
      if (!_el || !document.body.contains(_el)) {
        _el = document.createElement('div');
        _el.id = 'ppk-loading';
        _el.style.cssText = [
          'position:fixed;inset:0;',
          'background:rgba(15,23,42,.45);',
          'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
          'z-index:999998;',
          'display:flex;flex-direction:column;',
          'align-items:center;justify-content:center;',
          'gap:16px;',
          'font-family:"Kanit","Sarabun",sans-serif;',
          'color:#fff;font-size:15px;',
        ].join('');
        _el.innerHTML =
          '<div style="width:48px;height:48px;border:4px solid rgba(255,255,255,.25);' +
          'border-top-color:#60a5fa;border-radius:50%;animation:ppk-spin .8s linear infinite;"></div>' +
          '<div id="ppk-loading-msg">' + (message || 'กำลังดำเนินการ...') + '</div>';

        var style = document.createElement('style');
        style.textContent = '@keyframes ppk-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
        document.body.appendChild(_el);
      } else {
        var msgEl = _el.querySelector('#ppk-loading-msg');
        if (msgEl) msgEl.textContent = message || 'กำลังดำเนินการ...';
      }
    } else {
      if (_el && _el.parentNode) _el.parentNode.removeChild(_el);
      _el = null;
    }
  };
})();

/* ══════════════════════════════════════════════════════════
   SESSION EXPIRY WARNING
   เรียกหลัง checkSession() สำเร็จ — แจ้งเตือน 5 นาทีก่อน หมดอายุ
══════════════════════════════════════════════════════════ */
(function () {
  var _warned = false;
  var _interval = null;

  window.ppkWatchSession = function (expiresAt) {
    if (_interval) clearInterval(_interval);
    _warned = false;
    var expireMs = new Date(expiresAt).getTime();

    _interval = setInterval(function () {
      var remaining = expireMs - Date.now();
      if (remaining <= 0) {
        clearInterval(_interval);
        ppkToast('เซสชันหมดอายุ — กำลังนำคุณออกจากระบบ...', 'warning', 5000);
        setTimeout(function () {
          localStorage.clear();
          window.location.href = 'login.html';
        }, 3000);
      } else if (!_warned && remaining < 5 * 60 * 1000) {
        _warned = true;
        ppkToast('⏰ เซสชันจะหมดอายุใน 5 นาที', 'warning', 8000);
      }
    }, 30000); // ตรวจทุก 30 วินาที
  };
})();
