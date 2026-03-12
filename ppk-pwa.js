// HOME PPK 2026 — PWA Install Prompt v1.0
// แสดงคำแนะนำสร้างแอปง่ายๆ สำหรับผู้ใช้ทุกระดับ
(function () {
  'use strict';

  // ---- ตรวจสอบว่าอยู่ใน standalone mode แล้วหรือยัง ----
  var isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return; // ติดตั้งแล้ว ไม่ต้องแสดง

  // ---- ตรวจสอบ dismiss ----
  var DISMISS_KEY = 'ppk_pwa_dismiss';
  var DISMISS_DAYS = 3;
  var dismissed = localStorage.getItem(DISMISS_KEY);
  if (dismissed && (Date.now() - parseInt(dismissed)) < DISMISS_DAYS * 86400000) return;

  // ---- ตรวจจับ OS ----
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isChrome = /Chrome/i.test(ua) && !/Edge|OPR/i.test(ua);
  var isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
  var isInAppBrowser = /Line|FBAN|FBAV|Instagram|Messenger/i.test(ua);

  // ---- Android: จับ beforeinstallprompt ----
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  // ---- สร้าง UI ----
  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'ppkInstallOverlay';

    // ---- เลือกคำแนะนำตาม OS ----
    var stepsHtml = '';

    if (isInAppBrowser) {
      stepsHtml =
        '<div class="ppk-install-step">' +
        '<div class="step-num">1</div>' +
        '<div class="step-text">กดปุ่ม <strong>⋮</strong> หรือ <strong>⋯</strong> (มุมขวาบน)</div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">2</div>' +
        '<div class="step-text">เลือก <strong>"เปิดใน Chrome"</strong> หรือ <strong>"เปิดใน Safari"</strong></div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">3</div>' +
        '<div class="step-text">หลังจากเปิดในเบราว์เซอร์แล้ว ทำตามขั้นตอนด้านล่าง</div>' +
        '</div>';
    } else if (isIOS) {
      stepsHtml =
        '<div class="ppk-install-step">' +
        '<div class="step-num">1</div>' +
        '<div class="step-text">กดปุ่ม <strong>แชร์</strong> <span class="step-icon">⬆</span> (ด้านล่างหน้าจอ)</div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">2</div>' +
        '<div class="step-text">เลื่อนลงแล้วกด <strong>"เพิ่มไปยังหน้าจอโฮม"</strong></div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">3</div>' +
        '<div class="step-text">กด <strong>"เพิ่ม"</strong> ที่มุมขวาบน — เสร็จแล้ว!</div>' +
        '</div>' +
        '<div class="ppk-install-img">' +
        '<div class="ios-share-demo">' +
        '<span class="share-arrow">⬆</span>' +
        '<span class="share-label">กดตรงนี้</span>' +
        '</div>' +
        '</div>';
    } else if (isAndroid && isChrome) {
      stepsHtml =
        '<div class="ppk-install-step">' +
        '<div class="step-num">1</div>' +
        '<div class="step-text">กดปุ่ม <strong>"ติดตั้งแอป"</strong> ด้านล่าง</div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">2</div>' +
        '<div class="step-text">กด <strong>"ติดตั้ง"</strong> ในหน้าต่างที่ขึ้นมา</div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">3</div>' +
        '<div class="step-text">แอปจะปรากฏที่หน้าจอโทรศัพท์ — เปิดใช้ได้เลย!</div>' +
        '</div>';
    } else {
      // Generic Android / other
      stepsHtml =
        '<div class="ppk-install-step">' +
        '<div class="step-num">1</div>' +
        '<div class="step-text">กดปุ่ม <strong>⋮</strong> (มุมขวาบนของเบราว์เซอร์)</div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">2</div>' +
        '<div class="step-text">เลือก <strong>"เพิ่มไปยังหน้าจอหลัก"</strong> หรือ <strong>"ติดตั้งแอป"</strong></div>' +
        '</div>' +
        '<div class="ppk-install-step">' +
        '<div class="step-num">3</div>' +
        '<div class="step-text">กด <strong>"เพิ่ม"</strong> — เสร็จแล้ว!</div>' +
        '</div>';
    }

    var installBtnHtml = '';
    if (isAndroid && isChrome && !isInAppBrowser) {
      installBtnHtml = '<button class="ppk-install-btn" id="ppkInstallBtn" onclick="ppkDoInstall()">📲 ติดตั้งแอป HOME PPK</button>';
    }

    overlay.innerHTML =
      '<div class="ppk-install-card">' +
      '<div class="ppk-install-header">' +
      '<div class="ppk-install-icon">🏠</div>' +
      '<div class="ppk-install-title">สร้างแอป HOME PPK</div>' +
      '<div class="ppk-install-subtitle">ใช้งานง่ายขึ้น เปิดได้จากหน้าจอโทรศัพท์</div>' +
      '</div>' +

      '<div class="ppk-install-benefit">' +
      '<div class="benefit-item">✅ เปิดเร็ว ไม่ต้องพิมพ์เว็บ</div>' +
      '<div class="benefit-item">✅ ใช้เหมือนแอปในมือถือ</div>' +
      '<div class="benefit-item">✅ ไม่เปลืองพื้นที่</div>' +
      '</div>' +

      '<div class="ppk-install-steps-title">📋 วิธีติดตั้ง (ง่ายมาก!)</div>' +
      '<div class="ppk-install-steps">' + stepsHtml + '</div>' +
      installBtnHtml +

      '<div class="ppk-install-actions">' +
      '<button class="ppk-install-later" onclick="ppkDismissInstall()">ไว้ทีหลัง</button>' +
      '<button class="ppk-install-skip" onclick="ppkSkipInstall()">ไม่ต้องแสดงอีก</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    // แสดงด้วย animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('show');
      });
    });
  }

  // ---- Android native install ----
  window.ppkDoInstall = function () {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (result) {
        if (result.outcome === 'accepted') {
          localStorage.setItem(DISMISS_KEY, '9999999999999');
          var ov = document.getElementById('ppkInstallOverlay');
          if (ov) ov.remove();
        }
        deferredPrompt = null;
      });
    }
  };

  // ---- ปิดชั่วคราว (แสดงอีก 3 วัน) ----
  window.ppkDismissInstall = function () {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    var ov = document.getElementById('ppkInstallOverlay');
    if (ov) { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 400); }
  };

  // ---- ปิดถาวร ----
  window.ppkSkipInstall = function () {
    localStorage.setItem(DISMISS_KEY, '9999999999999');
    var ov = document.getElementById('ppkInstallOverlay');
    if (ov) { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 400); }
  };

  // ---- CSS ----
  var style = document.createElement('style');
  style.textContent =
    '#ppkInstallOverlay{' +
    'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;' +
    'display:flex;align-items:center;justify-content:center;padding:1rem;' +
    'opacity:0;transition:opacity 0.35s ease;' +
    '}' +
    '#ppkInstallOverlay.show{opacity:1;}' +

    '.ppk-install-card{' +
    'background:#fff;border-radius:20px;max-width:420px;width:100%;' +
    'max-height:90vh;overflow-y:auto;padding:0;' +
    'box-shadow:0 20px 60px rgba(0,0,0,0.3);' +
    'transform:translateY(30px);transition:transform 0.35s ease;' +
    '}' +
    '#ppkInstallOverlay.show .ppk-install-card{transform:translateY(0);}' +

    '.ppk-install-header{' +
    'background:linear-gradient(135deg,#312E81,#4F46E5,#06B6D4);' +
    'padding:1.8rem 1.5rem 1.5rem;text-align:center;' +
    'border-radius:20px 20px 0 0;color:#fff;' +
    '}' +
    '.ppk-install-icon{font-size:3rem;margin-bottom:0.3rem;}' +
    '.ppk-install-title{font-size:1.3rem;font-weight:700;margin-bottom:0.2rem;}' +
    '.ppk-install-subtitle{font-size:0.88rem;opacity:0.9;}' +

    '.ppk-install-benefit{' +
    'padding:1rem 1.5rem 0;display:flex;flex-direction:column;gap:0.35rem;' +
    '}' +
    '.benefit-item{font-size:0.92rem;color:#374151;}' +

    '.ppk-install-steps-title{' +
    'padding:1rem 1.5rem 0.3rem;font-size:1rem;font-weight:700;color:#4F46E5;' +
    '}' +
    '.ppk-install-steps{padding:0 1.5rem;}' +

    '.ppk-install-step{' +
    'display:flex;align-items:flex-start;gap:0.7rem;padding:0.5rem 0;' +
    'border-bottom:1px solid #F1F5F9;' +
    '}' +
    '.ppk-install-step:last-child{border-bottom:none;}' +
    '.step-num{' +
    'flex-shrink:0;width:28px;height:28px;border-radius:50%;' +
    'background:#4F46E5;color:#fff;font-weight:700;font-size:0.85rem;' +
    'display:flex;align-items:center;justify-content:center;margin-top:2px;' +
    '}' +
    '.step-text{font-size:0.92rem;color:#374151;line-height:1.5;}' +
    '.step-icon{' +
    'display:inline-flex;align-items:center;justify-content:center;' +
    'width:22px;height:22px;background:#007AFF;color:#fff;' +
    'border-radius:4px;font-size:0.75rem;vertical-align:middle;' +
    '}' +

    '.ppk-install-img{text-align:center;padding:0.5rem 0 0;}' +
    '.ios-share-demo{' +
    'display:inline-flex;flex-direction:column;align-items:center;' +
    'background:#F8FAFC;border:2px dashed #94A3B8;border-radius:12px;' +
    'padding:0.6rem 1.5rem;gap:0.2rem;' +
    '}' +
    '.share-arrow{font-size:1.5rem;color:#007AFF;}' +
    '.share-label{font-size:0.78rem;color:#64748B;}' +

    '.ppk-install-btn{' +
    'display:block;width:calc(100% - 3rem);margin:1rem auto 0;' +
    'background:linear-gradient(135deg,#4F46E5,#06B6D4);color:#fff;' +
    'border:none;border-radius:12px;padding:0.9rem;' +
    'font-family:Kanit,sans-serif;font-size:1.05rem;font-weight:700;' +
    'cursor:pointer;transition:all 0.2s;' +
    '}' +
    '.ppk-install-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,70,229,0.35);}' +

    '.ppk-install-actions{' +
    'display:flex;gap:0.5rem;padding:1rem 1.5rem 1.5rem;' +
    'justify-content:center;' +
    '}' +
    '.ppk-install-later,.ppk-install-skip{' +
    'background:none;border:1.5px solid #E5E7EB;border-radius:10px;' +
    'padding:0.55rem 1.2rem;font-family:Kanit,sans-serif;' +
    'font-size:0.88rem;color:#6B7280;cursor:pointer;transition:all 0.15s;' +
    '}' +
    '.ppk-install-later:hover{border-color:#4F46E5;color:#4F46E5;}' +
    '.ppk-install-skip{font-size:0.8rem;color:#9CA3AF;border-color:#F1F5F9;}' +
    '.ppk-install-skip:hover{color:#DC2626;border-color:#FECACA;}';
  document.head.appendChild(style);

  // ---- Register Service Worker ----
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(function () { });
  }

  // ---- แสดง prompt หลังหน้าโหลดเสร็จ 2 วินาที ----
  function showWhenReady() {
    // แสดงเฉพาะหน้าที่ login แล้ว (dashboard, settings ฯลฯ)
    if (!localStorage.getItem('sessionToken')) return;
    setTimeout(createOverlay, 2000);
  }

  if (document.readyState === 'complete') {
    showWhenReady();
  } else {
    window.addEventListener('load', showWhenReady);
  }
})();
