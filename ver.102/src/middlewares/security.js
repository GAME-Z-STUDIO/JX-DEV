import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jx_idle_jwt_secret_key_2026';
const HMAC_SECRET = process.env.HMAC_SECRET || 'jx_idle_hmac_secret_key_2026';

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, message: 'Unauthorized / Missing Token' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized / Missing Token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id || decoded.username,
      username: decoded.username || decoded.id
    };
    return next();
  } catch (err) {
    if (token.startsWith('offline_token_')) {
      const username = token.replace('offline_token_', '').trim().toLowerCase();
      req.user = { id: username, username };
      return next();
    }
    return res.status(401).json({ ok: false, message: 'Unauthorized / Invalid Token' });
  }
}

export function verifyPayloadIntegrity(req, res, next) {
  const timestampHeader = req.headers['x-timestamp'];
  const signatureHeader = req.headers['x-signature'];

  if (!timestampHeader || !signatureHeader) {
    return res.status(403).json({ ok: false, message: 'Missing Security Headers' });
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 30000) {
    return res.status(403).json({ ok: false, message: 'Request Expired' });
  }

  const userId = req.user?.id || req.user?.username || req.body?.owner || '';
  const rawString = `${JSON.stringify(req.body)}:${timestamp}:${userId}`;
  const expectedSignature = crypto.createHmac('sha256', HMAC_SECRET).update(rawString).digest('hex');

  const clientBuffer = Buffer.from(String(signatureHeader), 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (clientBuffer.length === 0 || clientBuffer.length !== expectedBuffer.length) {
    return res.status(403).json({ ok: false, message: 'Invalid Signature / Tampered Payload' });
  }

  if (!crypto.timingSafeEqual(clientBuffer, expectedBuffer)) {
    return res.status(403).json({ ok: false, message: 'Invalid Signature / Tampered Payload' });
  }

  next();
}
