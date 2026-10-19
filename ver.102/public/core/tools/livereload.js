/**
 * JX - IDLE: Real-time Live-Reload Client (SSE + Boot-ID Tracking)
 * Displays an interactive 5-second countdown notification box when any
 * server/client file changes, allowing immediate click-to-reload or auto-reload.
 */
(function() {
  'use strict';

  let eventSource = null;
  let isUpdatePending = false;
  let countdownTimer = null;
  let remainingSeconds = 5;
  let lastBootId = null;

  function saveBeforeReload() {
    try {
      if (typeof window.gameSave === 'function') {
        window.gameSave();
      } else if (window.__JX && typeof window.__JX.save === 'function') {
        window.__JX.save();
      }
      if (typeof window.forceOfflineSave === 'function') {
        window.forceOfflineSave();
      }
    } catch (e) {}
  }

  function executeReloadNow() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    const btn = document.getElementById('jx-update-reload-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đang lưu & tải lại...';
    }
    saveBeforeReload();
    setTimeout(() => {
      location.reload();
    }, 120);
  }

  function showUpdateModal(reason) {
    if (isUpdatePending) return;
    isUpdatePending = true;
    remainingSeconds = 5;

    saveBeforeReload();

    let modal = document.getElementById('jx-update-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'jx-update-modal';
      modal.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:2147483647',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'background:rgba(5, 8, 7, 0.78)',
        'backdrop-filter:blur(4px)',
        'font-family:"IBM Plex Mono", Tahoma, sans-serif',
        'user-select:none'
      ].join(';');

      modal.innerHTML = `
        <div style="
          width:min(400px, 92vw);
          background:linear-gradient(180deg, #242018 0%, #14120d 100%);
          border:2px solid #b9974f;
          box-shadow:0 0 0 1px #000, 0 12px 36px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,233,176,0.2);
          border-radius:8px;
          padding:20px 18px 18px;
          text-align:center;
          color:#e9e1c2;
        ">
          <div style="font-size:32px;line-height:1;margin-bottom:8px">⚡</div>
          <h3 style="margin:0 0 8px;color:#ffd970;font-size:16px;letter-spacing:0.5px;text-shadow:0 1px 2px #000">
            CÓ BẢN CẬP NHẬT MỚI!
          </h3>
          <p id="jx-update-reason" style="margin:0 0 12px;font-size:12.5px;color:#cfc8a8;line-height:1.45">
            Máy chủ hoặc mã nguồn vừa được cập nhật (${reason || 'Live Update'}).<br>
            Dữ liệu nhân vật của bạn đã được tự động lưu an toàn.
          </p>
          <div style="
            margin:0 auto 14px;
            padding:8px 12px;
            background:rgba(0,0,0,0.45);
            border:1px solid #5c5338;
            border-radius:6px;
            font-size:13px;
            color:#ffe9b0;
          ">
            Tự động tải lại sau <b id="jx-update-timer" style="color:#ff6a55;font-size:16px">5</b> giây...
          </div>
          <button id="jx-update-reload-btn" style="
            width:100%;
            padding:10px 16px;
            background:linear-gradient(180deg, #8a7434 0%, #4a3c14 100%);
            border:1px solid #f0c36a;
            border-radius:5px;
            color:#fff6d8;
            font-weight:700;
            font-size:13.5px;
            cursor:pointer;
            text-shadow:0 1px 2px #000;
            box-shadow:0 2px 8px rgba(0,0,0,0.6);
          ">
            🔄 Cập Nhật Ngay (Click để Reload)
          </button>
        </div>
      `;

      document.body.appendChild(modal);
      const reloadBtn = document.getElementById('jx-update-reload-btn');
      if (reloadBtn) {
        reloadBtn.onclick = executeReloadNow;
      }
    }

    const timerEl = document.getElementById('jx-update-timer');
    countdownTimer = setInterval(() => {
      remainingSeconds--;
      if (timerEl) {
        timerEl.textContent = String(Math.max(0, remainingSeconds));
      }
      if (remainingSeconds <= 0) {
        executeReloadNow();
      }
    }, 1000);
  }

  function initSSE() {
    if (typeof EventSource === 'undefined') {
      initPolling();
      return;
    }

    try {
      eventSource = new EventSource('/live-reload');

      eventSource.onopen = function() {
        console.log('[Live-Reload] Đã kết nối kênh Push SSE với máy chủ.');
      };

      eventSource.onmessage = function(e) {
        const msg = String(e.data || '');
        if (msg === 'reload' || msg.indexOf('reload:') === 0) {
          const detail = msg.indexOf('reload:') === 0 ? msg.substring(7) : 'Tệp tin thay đổi';
          showUpdateModal(detail);
        } else if (msg.indexOf('boot:') === 0) {
          const bootId = msg.substring(5);
          if (lastBootId !== null && lastBootId !== bootId) {
            showUpdateModal('Khởi động lại Máy chủ');
          } else {
            lastBootId = bootId;
          }
        }
      };

      eventSource.onerror = function() {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        setTimeout(initSSE, 1000);
      };
    } catch (err) {
      initPolling();
    }
  }

  let currentVer = null;
  async function initPolling() {
    try {
      const url = '/api/live-check' + (currentVer ? '?v=' + currentVer : '');
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (currentVer === null) {
          currentVer = data.v;
        } else if (data.changed && data.v > currentVer) {
          currentVer = data.v;
          showUpdateModal('Cập nhật hệ thống');
          return;
        }
      }
    } catch (e) {
    } finally {
      if (!isUpdatePending) {
        setTimeout(initPolling, 1500);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSSE);
  } else {
    initSSE();
  }
})();
