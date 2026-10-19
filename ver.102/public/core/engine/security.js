(function () {
  'use strict';

  const APP_SECRET = 'jx_idle_hmac_secret_key_2026';

  async function computeHmacSha256(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(message);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sendSecureSave(url, payload, options = {}) {
    const timestamp = Date.now();
    const sessionUser = window.JXSession && typeof window.JXSession.getUser === 'function' ? window.JXSession.getUser() : null;
    const sessionToken = window.JXSession && typeof window.JXSession.getToken === 'function' ? window.JXSession.getToken() : null;
    const userId = (sessionUser || payload?.owner || '').trim().toLowerCase();
    if (!userId) return Promise.reject(new Error('Chưa đăng nhập'));
    const token = sessionToken || '';

    const rawString = `${JSON.stringify(payload)}:${timestamp}:${userId}`;
    const signature = await computeHmacSha256(rawString, window.__HMAC_SECRET || APP_SECRET);

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Timestamp': String(timestamp),
      'X-Signature': signature,
      ...(options.headers || {})
    };

    return fetch(url, {
      method: options.method || 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: !!options.keepalive
    });
  }

  window.sendSecureSave = sendSecureSave;
  window.computeHmacSha256 = computeHmacSha256;
})();
