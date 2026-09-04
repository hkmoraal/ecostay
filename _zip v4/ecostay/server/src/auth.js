// Lightweight access gates for the MVP.
//
// NOTE: This is intentionally simple — a shared key per role, not real user
// accounts. It keeps the auditor/admin areas gated without building a full
// auth system. Replace with proper authentication before a public launch.
//
//   AUDITOR_KEY  — unlocks the auditor area (list/claim/submit audits, upload)
//   ADMIN_KEY    — unlocks admin decisions (approve/reject an audit)

const AUDITOR_KEY = process.env.AUDITOR_KEY || '';
const ADMIN_KEY   = process.env.ADMIN_KEY   || '';

export function requireAuditor(req, res, next) {
  if (!AUDITOR_KEY) {
    return res.status(503).json({ error: 'Auditor-toegang is nog niet geconfigureerd (AUDITOR_KEY ontbreekt).' });
  }
  const key = req.get('x-auditor-key') || '';
  // Allow the admin key to also act as an auditor for convenience.
  if (key === AUDITOR_KEY || (ADMIN_KEY && key === ADMIN_KEY)) return next();
  return res.status(401).json({ error: 'Ongeldige of ontbrekende auditor-sleutel.' });
}

export function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: 'Admin-toegang is nog niet geconfigureerd (ADMIN_KEY ontbreekt).' });
  }
  const key = req.get('x-admin-key') || req.get('x-auditor-key') || '';
  if (key === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Ongeldige of ontbrekende admin-sleutel.' });
}

// ---- Verblijfseigenaar (magic-link sessie) ----
// Anders dan de sleutels hierboven is dit een echte, per-persoon sessie:
// de browser stuurt 'x-owner-token' mee; we zoeken de bijbehorende sessie op
// en zetten req.ownerEmail. Verlopen sessies worden geweigerd.
import crypto from 'crypto';
import { query } from './db.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requireOwner(req, res, next) {
  try {
    const token = req.get('x-owner-token') || '';
    if (!token) return res.status(401).json({ error: 'Niet ingelogd.' });
    const [session] = await query(
      `SELECT email FROM owner_sessions
        WHERE token_hash = :h AND expires_at > now()
        LIMIT 1`,
      { h: hashToken(token) }
    );
    if (!session) return res.status(401).json({ error: 'Sessie verlopen of ongeldig. Log opnieuw in.' });
    req.ownerEmail = session.email;
    next();
  } catch (err) {
    next(err);
  }
}
