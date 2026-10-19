import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'jx_idle_jwt_secret_key_2026';

// 1. POST /api/auth (Sign In, Sign Up, Sign Out)
router.post('/auth', async (req, res) => {
  try {
    const { action, username, email, password } = req.body || {};
    const act = String(action || '').toLowerCase().trim();
    const cleanUser = String(username || email || '').replace(/@.*$/, '').toLowerCase().trim();

    // Sign Out
    if (act === 'out') {
      if (cleanUser) {
        await pool.query(
          'UPDATE `c_data` SET `CURRENT` = "OFFLINE", `SESSION_ID` = NULL, `LAST_SEEN` = NOW() WHERE `USERNAME` = ?',
          [cleanUser]
        );
      }
      res.setHeader('Set-Cookie', [
        'jx_sid=; path=/; max-age=0; SameSite=Lax',
        'jx_token=; path=/; max-age=0; SameSite=Lax',
        'jx_user=; path=/; max-age=0; SameSite=Lax'
      ]);
      console.log(`[Auth] User signed out: [${cleanUser}] -> Status: OFFLINE`);
      return res.json({ ok: true });
    }

    if (!cleanUser || cleanUser.length < 3) {
      return res.status(400).json({ ok: false, message: 'Tên đăng nhập ít nhất 3 ký tự' });
    }

    if (cleanUser.length > 32) {
      return res.status(400).json({ ok: false, message: 'Tên đăng nhập tối đa 32 ký tự' });
    }

    const cleanPass = String(password || '');

    // Sign Up
    if (act === 'up') {
      if (!cleanPass || cleanPass.length < 4) {
        return res.status(400).json({ ok: false, message: 'Mật mã phải từ 4 ký tự trở lên' });
      }

      const [existing] = await pool.query(
        'SELECT `ID` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
        [cleanUser]
      );

      if (existing.length > 0) {
        return res.status(400).json({ ok: false, message: 'Tên đăng nhập đã có người dùng' });
      }

      const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);

      await pool.query(
        `INSERT INTO \`c_data\` (\`USERNAME\`, \`PASSWD\`, \`STATUS\`, \`CURRENT\`, \`SESSION_ID\`, \`LAST_SEEN\`, \`CREATED_AT\`, \`UPDATED_AT\`)
         VALUES (?, ?, 'NORMAL', 'ONLINE', ?, NOW(), NOW(), NOW())`,
        [cleanUser, cleanPass, sid]
      );

      console.log(`[Auth] Registered new account: [${cleanUser}]`);

      const accessToken = jwt.sign(
        { id: cleanUser, username: cleanUser, sid },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.setHeader('Set-Cookie', [
        `jx_sid=${encodeURIComponent(sid)}; path=/; max-age=604800; SameSite=Lax`,
        `jx_token=${encodeURIComponent(accessToken)}; path=/; max-age=604800; SameSite=Lax`,
        `jx_user=${encodeURIComponent(cleanUser)}; path=/; max-age=604800; SameSite=Lax`
      ]);

      return res.json({
        ok: true,
        user: {
          id: cleanUser,
          name: cleanUser,
          email: `${cleanUser}@offline.local`
        },
        session: {
          access_token: accessToken,
          session_id: sid
        }
      });
    }

    // Sign In
    if (act === 'in') {
      const [rows] = await pool.query(
        'SELECT `ID`, `USERNAME`, `PASSWD`, `STATUS`, `CURRENT`, `SESSION_ID` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
        [cleanUser]
      );

      if (rows.length === 0) {
        return res.status(400).json({ ok: false, message: 'Tài khoản không tồn tại' });
      }

      const user = rows[0];

      if (user.STATUS === 'FORBID') {
        console.warn(`[Auth] Rejected banned account: [${cleanUser}]`);
        return res.status(403).json({ ok: false, message: 'Tài khoản của bạn đã bị khóa (FORBID)' });
      }

      if (cleanPass && user.PASSWD !== cleanPass) {
        return res.status(400).json({ ok: false, message: 'Mật mã không chính xác' });
      }

      const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);

      await pool.query(
        'UPDATE `c_data` SET `CURRENT` = "ONLINE", `SESSION_ID` = ?, `LAST_SEEN` = NOW(), `UPDATED_AT` = NOW() WHERE `ID` = ?',
        [sid, user.ID]
      );

      console.log(`[Auth] Successfully logged in: [${cleanUser}] -> Status: ONLINE (sid: ${sid})`);

      const accessToken = jwt.sign(
        { id: cleanUser, username: cleanUser, sid },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.setHeader('Set-Cookie', [
        `jx_sid=${encodeURIComponent(sid)}; path=/; max-age=604800; SameSite=Lax`,
        `jx_token=${encodeURIComponent(accessToken)}; path=/; max-age=604800; SameSite=Lax`,
        `jx_user=${encodeURIComponent(cleanUser)}; path=/; max-age=604800; SameSite=Lax`
      ]);

      return res.json({
        ok: true,
        user: {
          id: cleanUser,
          name: cleanUser,
          email: `${cleanUser}@offline.local`
        },
        session: {
          access_token: accessToken,
          session_id: sid
        }
      });
    }

    return res.status(400).json({ ok: false, message: 'Thao tác không hợp lệ' });
  } catch (error) {
    console.error('[Auth Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi hệ thống máy chủ' });
  }
});

// 2. POST /api/heartbeat (Heartbeat Monitor & Kick Detection)
router.post('/heartbeat', async (req, res) => {
  try {
    let cleanUser = '';
    let clientSid = '';

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        cleanUser = decoded.username || decoded.id || '';
        clientSid = decoded.sid || '';
      } catch (e) {}
    }

    if (!cleanUser && req.body) {
      cleanUser = String(req.body.username || req.body.owner || '').trim().toLowerCase();
      clientSid = String(req.body.sessionId || req.body.sid || '').trim();
    }

    if (!cleanUser && req.headers.cookie) {
      const matchUser = req.headers.cookie.match(/(?:^|; )jx_user=([^;]*)/);
      const matchSid = req.headers.cookie.match(/(?:^|; )jx_sid=([^;]*)/);
      if (matchUser) cleanUser = decodeURIComponent(matchUser[1]).trim().toLowerCase();
      if (matchSid) clientSid = decodeURIComponent(matchSid[1]).trim();
    }

    if (!cleanUser) {
      return res.status(401).json({ ok: false, kick: true, reason: 'Chưa đăng nhập' });
    }

    const [rows] = await pool.query(
      'SELECT `ID`, `STATUS`, `CURRENT`, `SESSION_ID` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [cleanUser]
    );

    if (rows.length === 0) {
      return res.json({ ok: false, kick: true, reason: 'Tài khoản không tồn tại trên hệ thống' });
    }

    const user = rows[0];

    // Ban check
    if (user.STATUS === 'FORBID') {
      return res.json({ ok: false, kick: true, reason: 'Tài khoản của bạn đã bị khóa (FORBID)' });
    }

    // Session validation
    if (!user.SESSION_ID) {
      return res.json({ ok: false, kick: true, reason: 'Phiên đăng nhập đã kết thúc' });
    }

    if (clientSid && user.SESSION_ID !== clientSid) {
      return res.json({ ok: false, kick: true, reason: 'Tài khoản đã được đăng nhập từ một thiết bị khác' });
    }

    // Update active presence
    await pool.query(
      'UPDATE `c_data` SET `CURRENT` = "ONLINE", `LAST_SEEN` = NOW() WHERE `ID` = ?',
      [user.ID]
    );

    return res.json({ ok: true, status: user.STATUS, current: 'ONLINE', username: cleanUser });
  } catch (error) {
    console.error('[Heartbeat Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi heartbeat' });
  }
});

export default router;
