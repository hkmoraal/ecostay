/**
 * Admin area — all endpoints gated by the admin key (x-admin-key).
 *
 * GET   /api/admin/overview          Dashboard counts + revenue.
 * GET   /api/admin/stays?status=&q=  All accommodations (full fields).
 * PATCH /api/admin/stays/:slug       Edit stay data.
 * POST  /api/admin/stays/:slug/status  Set status (invited/draft/certified/canceled).
 * GET   /api/admin/audits            All audits + stay + evidence counts.
 * GET   /api/admin/auditors          Distinct auditors with audit counts.
 *
 * Approving/rejecting a submitted audit uses the existing
 * POST /api/audits/:id/decision endpoint (also admin-gated).
 */

import { Router } from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../auth.js';
import { levelInfo } from '../scoring.js';

const router = Router();
router.use(requireAdmin);

// ---- Dashboard overview ----
router.get('/overview', async (req, res, next) => {
  try {
    const [byStatus] = await query(
      `SELECT
         count(*)                                    AS total,
         count(*) FILTER (WHERE status = 'invited')   AS invited,
         count(*) FILTER (WHERE status = 'draft')     AS draft,
         count(*) FILTER (WHERE status = 'certified') AS certified,
         count(*) FILTER (WHERE status = 'canceled')  AS canceled
       FROM accommodations`
    );
    const [byLevel] = await query(
      `SELECT
         count(*) FILTER (WHERE level = 1) AS brons,
         count(*) FILTER (WHERE level = 2) AS zilver,
         count(*) FILTER (WHERE level = 3) AS goud
       FROM accommodations`
    );
    const [byTier] = await query(
      `SELECT
         count(*) FILTER (WHERE tier = 'self')     AS self,
         count(*) FILTER (WHERE tier = 'verified') AS verified
       FROM accommodations`
    );
    const [byAudit] = await query(
      `SELECT
         count(*) FILTER (WHERE status = 'available') AS available,
         count(*) FILTER (WHERE status = 'claimed')   AS claimed,
         count(*) FILTER (WHERE status = 'submitted') AS submitted,
         count(*) FILTER (WHERE status = 'approved')  AS approved,
         count(*) FILTER (WHERE status = 'rejected')  AS rejected
       FROM audits`
    );
    const [revenue] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS monthly
         FROM billing_subscriptions
        WHERE status = 'active'`
    );

    res.json({
      stays:  numify(byStatus),
      levels: numify(byLevel),
      tiers:  numify(byTier),
      audits: numify(byAudit),
      revenue: { monthly: Number(revenue.monthly) },
    });
  } catch (err) { next(err); }
});

// ---- All stays ----
router.get('/stays', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = [];
    const params = {};
    if (status && status !== 'all') { where.push('status = :status'); params.status = status; }
    if (q) { where.push('(name ILIKE :q OR city ILIKE :q OR country ILIKE :q)'); params.q = `%${q}%`; }
    const rows = await query(
      `SELECT id, slug, name, type, city, country, description, website, contact_email,
              image_url, score, level, status, tier, audit_status, verified_at,
              created_at, updated_at, canceled_at
         FROM accommodations
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY updated_at DESC`,
      params
    );
    res.json({ stays: rows.map((r) => ({ ...r, score: Number(r.score), ...levelExtra(r.level) })) });
  } catch (err) { next(err); }
});

// ---- Edit stay data ----
const EDITABLE = ['name', 'type', 'city', 'country', 'description', 'website', 'contact_email', 'image_url'];
router.patch('/stays/:slug', async (req, res, next) => {
  try {
    const fields = EDITABLE.filter((f) => f in (req.body || {}));
    if (fields.length === 0) return res.status(400).json({ error: 'Geen wijzigbare velden meegegeven' });

    const set = fields.map((f) => `${f} = :${f}`).join(', ');
    const params = { slug: req.params.slug };
    for (const f of fields) params[f] = req.body[f];

    const rows = await query(
      `UPDATE accommodations SET ${set} WHERE slug = :slug RETURNING slug`,
      params
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Verblijf niet gevonden' });
    res.json({ updated: true });
  } catch (err) { next(err); }
});

// ---- Delete a stay (and everything linked, via ON DELETE CASCADE) ----
router.delete('/stays/:slug', async (req, res, next) => {
  try {
    // Zeg eerst een eventueel actief Mollie-abonnement op (best effort).
    try {
      const [acc] = await query('SELECT id FROM accommodations WHERE slug = :slug', { slug: req.params.slug });
      if (acc) {
        const [sub] = await query(
          `SELECT mollie_subscription_id, mollie_customer_id
             FROM billing_subscriptions
            WHERE accommodation_id = :acc AND status = 'active'
            ORDER BY created_at DESC LIMIT 1`,
          { acc: acc.id }
        );
        if (sub?.mollie_subscription_id && sub?.mollie_customer_id) {
          const { mollie, mollieConfigured } = await import('../mollie.js');
          if (mollieConfigured()) {
            await mollie.customerSubscriptions.cancel(sub.mollie_subscription_id, {
              customerId: sub.mollie_customer_id,
            });
          }
        }
      }
    } catch (mErr) {
      console.error('[admin] Mollie opzeggen bij verwijderen mislukt:', mErr.message);
    }

    const rows = await query(
      'DELETE FROM accommodations WHERE slug = :slug RETURNING slug',
      { slug: req.params.slug }
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Verblijf niet gevonden' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ---- Set status ----
const STATUSES = ['invited', 'draft', 'certified', 'canceled'];
router.post('/stays/:slug/status', async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status moet één van ${STATUSES.join(', ')} zijn` });
    }
    // Setting canceled stamps canceled_at; leaving canceled clears it.
    // Use two separate params to avoid Postgres type-inference clashes when the
    // same placeholder is reused in both an assignment and a comparison.
    const rows = await query(
      `UPDATE accommodations
          SET status = :status,
              canceled_at = CASE WHEN :statusCheck = 'canceled' THEN now() ELSE NULL END
        WHERE slug = :slug
        RETURNING slug`,
      { status, statusCheck: status, slug: req.params.slug }
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Verblijf niet gevonden' });
    res.json({ updated: true, status });
  } catch (err) { next(err); }
});

// ---- All audits with evidence counts ----
router.get('/audits', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = [];
    const params = {};
    if (status && status !== 'all') { where.push('au.status = :status'); params.status = status; }
    const rows = await query(
      `SELECT au.id, au.status, au.auditor_name, au.auditor_email, au.notes,
              au.claimed_at, au.submitted_at, au.decided_at, au.created_at,
              a.slug, a.name, a.city, a.country, a.audit_status,
              (SELECT count(*) FROM audit_answers aa WHERE aa.audit_id = au.id) AS answer_count,
              (SELECT count(*) FROM audit_photos  ap WHERE ap.audit_id = au.id) AS photo_count
         FROM audits au
         JOIN accommodations a ON a.id = au.accommodation_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY au.created_at DESC`,
      params
    );
    res.json({ audits: rows.map((r) => ({
      ...r, answer_count: Number(r.answer_count), photo_count: Number(r.photo_count),
    })) });
  } catch (err) { next(err); }
});

// ---- Distinct auditors ----
router.get('/auditors', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT auditor_email, MAX(auditor_name) AS auditor_name,
              count(*)                                  AS total,
              count(*) FILTER (WHERE status = 'submitted') AS submitted,
              count(*) FILTER (WHERE status = 'approved')  AS approved
         FROM audits
        WHERE auditor_email IS NOT NULL
        GROUP BY auditor_email
        ORDER BY total DESC`
    );
    res.json({ auditors: rows.map((r) => ({
      ...r, total: Number(r.total), submitted: Number(r.submitted), approved: Number(r.approved),
    })) });
  } catch (err) { next(err); }
});

function numify(row) {
  const out = {};
  for (const k of Object.keys(row)) out[k] = Number(row[k]);
  return out;
}
function levelExtra(level) {
  const info = levelInfo(level);
  return { levelKey: info.key, levelLabel: info.label };
}

export default router;
