import express from 'express';
import { pool } from '../config/db.js';
import { verifyToken, verifyPayloadIntegrity } from '../middlewares/security.js';

const router = express.Router();

// Helper to safely parse state
function parseState(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Helper to recursively unwrap nested character state
function unwrapCharacterState(raw) {
  if (!raw) return null;
  let curr = raw;
  for (let i = 0; i < 10; i++) {
    if (typeof curr === 'string') {
      try {
        curr = JSON.parse(curr);
      } catch (e) {
        break;
      }
    } else if (curr && typeof curr === 'object') {
      if (curr.state && (typeof curr.state === 'object' || typeof curr.state === 'string')) {
        curr = curr.state;
        continue;
      }
      if (curr.data && (typeof curr.data === 'object' || typeof curr.data === 'string')) {
        curr = curr.data;
        continue;
      }
      if (curr.d && (typeof curr.d === 'object' || typeof curr.d === 'string')) {
        curr = curr.d;
        continue;
      }
      if (curr.fac && (curr.lvl !== undefined || curr.lvl | 0)) {
        return curr;
      }
      break;
    } else {
      break;
    }
  }
  return (curr && typeof curr === 'object' && curr.fac) ? curr : null;
}

router.get(['/saves', '/saves/list'], async (req, res) => {
  try {
    let owner = String(req.query.owner || '').trim().toLowerCase();
    if (!owner && req.user?.username) {
      owner = req.user.username.trim().toLowerCase();
    }
    if (!owner) {
      return res.json({ ok: true, data: [] });
    }

    const [rows] = await pool.query(
      'SELECT `ID`, `USERNAME`, `STATUS`, `DATA`, `UPDATED_MS`, `UPDATED_AT` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [owner]
    );

    if (rows.length === 0 || !rows[0].DATA) {
      return res.json({ ok: true, data: [] });
    }

    const row = rows[0];
    const parsed = parseState(row.DATA) || {};
    const unwrapped = unwrapCharacterState(row.DATA) || unwrapCharacterState(parsed);
    const updatedIso = row.UPDATED_MS ? new Date(Number(row.UPDATED_MS)).toISOString() : (row.UPDATED_AT ? new Date(row.UPDATED_AT).toISOString() : new Date().toISOString());

    const data = [
      {
        slot: Number(parsed?.slot ?? unwrapped?.slot ?? 0),
        name: unwrapped?.name || parsed.name || row.USERNAME,
        lvl: Number(unwrapped?.lvl || parsed.lvl || 1),
        fac: unwrapped?.fac || parsed.fac || 'vo0',
        data: row.DATA,
        state: unwrapped || parsed,
        updated: updatedIso
      }
    ];

    return res.json({ ok: true, data });
  } catch (error) {
    console.error('[Saves List Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi tải danh sách nhân vật' });
  }
});

router.get('/saves/get', async (req, res) => {
  try {
    const owner = String(req.query.owner || req.user?.username || '').trim().toLowerCase();

    const [rows] = await pool.query(
      'SELECT `ID`, `USERNAME`, `STATUS`, `DATA`, `UPDATED_MS`, `UPDATED_AT` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [owner]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản nhân vật' });
    }

    const user = rows[0];

    if (user.STATUS === 'FORBID') {
      return res.status(403).json({ ok: false, message: 'Tài khoản đã bị khóa (FORBID)' });
    }

    if (!user.DATA) {
      return res.status(404).json({ ok: false, message: 'Chưa có dữ liệu nhân vật' });
    }

    const parsed = parseState(user.DATA) || {};
    const unwrapped = unwrapCharacterState(user.DATA) || unwrapCharacterState(parsed);
    const updatedIso = user.UPDATED_MS ? new Date(Number(user.UPDATED_MS)).toISOString() : (user.UPDATED_AT ? new Date(user.UPDATED_AT).toISOString() : new Date().toISOString());
    const result = {
      slot: Number(parsed?.slot ?? unwrapped?.slot ?? 0),
      name: unwrapped?.name || parsed.name || user.USERNAME,
      lvl: Number(unwrapped?.lvl || parsed.lvl || 1),
      fac: unwrapped?.fac || parsed.fac || 'vo0',
      data: parsed?.data || user.DATA,
      state: unwrapped || parsed,
      updated: updatedIso
    };
    return res.json({ ok: true, data: result });
  } catch (error) {
    console.error('[Saves Get Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi tải dữ liệu nhân vật' });
  }
});

router.post('/saves', verifyToken, verifyPayloadIntegrity, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const body = req.body || {};
    const owner = String(body.owner || req.user?.username || '').trim().toLowerCase();

    if (!owner) {
      return res.status(400).json({ ok: false, message: 'Thiếu thông tin tài khoản sở hữu' });
    }

    const [users] = await connection.query(
      'SELECT `ID`, `STATUS` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [owner]
    );

    if (users.length === 0) {
      return res.status(404).json({ ok: false, message: 'Không tìm thấy tài khoản' });
    }

    if (users[0].STATUS === 'FORBID') {
      return res.status(403).json({ ok: false, message: 'Tài khoản đã bị khóa (FORBID)' });
    }

    const charId = users[0].ID;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const rawPayload = JSON.stringify(body);

    await connection.beginTransaction();

    await connection.query(
      `UPDATE \`c_data\`
       SET \`DATA\` = ?, \`UPDATED_MS\` = ?, \`CURRENT\` = 'ONLINE', \`LAST_SEEN\` = NOW(), \`UPDATED_AT\` = NOW()
       WHERE \`ID\` = ?`,
      [rawPayload, nowMs, charId]
    );

    const snapData = body.snap || body.data?.snap || body.saveData?.snap;
    if (snapData) {
      await connection.query(
        `INSERT INTO \`c_snapshot\` (\`CHARACTER_ID\`, \`SNAP_DATA\`, \`UPDATED_AT\`)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           \`SNAP_DATA\` = VALUES(\`SNAP_DATA\`),
           \`UPDATED_AT\` = NOW()`,
        [charId, JSON.stringify(snapData)]
      );
    }

    await connection.commit();

    console.log(`[Char Save] 💾 Saved state to c_data: [${owner}] (Char ID: ${charId})`);

    return res.json({ ok: true, updated: nowIso, updatedMs: nowMs });
  } catch (error) {
    await connection.rollback();
    console.error('[Saves Post Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi lưu trữ dữ liệu nhân vật' });
  } finally {
    connection.release();
  }
});

// 4. DELETE /api/saves (Delete Character)
router.delete('/saves', verifyToken, async (req, res) => {
  try {
    const owner = String(req.query.owner || req.body?.owner || req.user?.username || '').trim().toLowerCase();

    if (!owner) {
      return res.status(400).json({ ok: false, message: 'Thiếu thông tin tài khoản' });
    }

    const [rows] = await pool.query(
      'SELECT `ID` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [owner]
    );

    if (rows.length > 0) {
      const charId = rows[0].ID;
      await pool.query('UPDATE `c_data` SET `DATA` = NULL, `UPDATED_AT` = NOW() WHERE `ID` = ?', [charId]);
      await pool.query('DELETE FROM `c_snapshot` WHERE `CHARACTER_ID` = ?', [charId]);
      console.log(`[Char Delete] 🗑️ Reset character data for [${owner}] (Char ID: ${charId})`);
    }

    return res.json({ ok: true, deleted: true });
  } catch (error) {
    console.error('[Saves Delete Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi xóa nhân vật' });
  }
});

// 5. POST /api/chars (Combat & Snapshot Sync into c_snapshot)
router.post('/chars', verifyToken, verifyPayloadIntegrity, async (req, res) => {
  try {
    const body = req.body || {};
    const owner = String(body.owner || req.user?.username || '').trim().toLowerCase();

    if (!owner) {
      return res.status(400).json({ ok: false, message: 'Thiếu thông tin tài khoản' });
    }

    const [rows] = await pool.query(
      'SELECT `ID`, `STATUS` FROM `c_data` WHERE `USERNAME` = ? LIMIT 1',
      [owner]
    );

    if (rows.length === 0 || rows[0].STATUS === 'FORBID') {
      return res.status(403).json({ ok: false, message: 'Tài khoản không hợp lệ hoặc bị khóa' });
    }

    const charId = rows[0].ID;
    const snapPayload = JSON.stringify({
      snap: body.snap,
      gear: body.gear,
      reborn: body.reborn,
      tower: body.tower,
      bosses: body.bosses
    });

    await pool.query(
      `INSERT INTO \`c_snapshot\` (\`CHARACTER_ID\`, \`SNAP_DATA\`, \`UPDATED_AT\`)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         \`SNAP_DATA\` = VALUES(\`SNAP_DATA\`),
         \`UPDATED_AT\` = NOW()`,
      [charId, snapPayload]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Chars Sync Error]', error);
    return res.status(500).json({ ok: false, message: 'Lỗi đồng bộ snapshot' });
  }
});

export default router;
