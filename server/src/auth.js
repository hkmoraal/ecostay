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
