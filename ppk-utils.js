/**
 * PPK Utils — Beautiful Modal Dialogs
 * แทนที่ confirm() และ alert() ของ Browser ด้วย Modal สวยๆ
 */
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
