/**
 * Auditor workflow.
 *
 * GET    /api/audits?status=available   List audits (auditor area).      [auditor]
 * GET    /api/audits/:id                One audit + stay + criteria + answers/photos. [auditor]
 * POST   /api/audits/:id/claim          Claim an available audit.        [auditor]
 *        body: { auditor_name, auditor_email }
 * POST   /api/audits/:id/submit         Submit verdicts + photo evidence. [auditor]
 *        body: { outcome: 'verified'|'rejected', notes,
 *                answers: [{ criterion_id, verdict, note }],
 *                photos:  [{ criterion_id, url, public_id }] }
 * POST   /api/audits/:id/decision       Admin override (optional).       [admin]
 *        body: { decision: 'approve'|'reject' }
 */

import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuditor, requireAdmin } from '../auth.js';

const router = Router();

// ---- List audits ----
router.get('/', requireAuditor, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = [];
    const params = {};
    if (status && status !== 'all') {
      where.push('au.status = :status');
      params.status = status;
    }
    const rows = await query(
      `SELECT au.id, au.status, au.auditor_name, au.auditor_email,
              au.claimed_at, au.submitted_at, au.created_at,
              a.slug, a.name, a.type, a.city, a.country
         FROM audits au
         JOIN accommodations a ON a.id = au.accommodation_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY au.created_at DESC`,
      params
    );
    res.json({ audits: rows });
  } catch (err) { next(err); }
});

// ---- One audit with everything the form needs ----
router.get('/:id', requireAuditor, async (req, res, next) => {
  try {
    const [audit] = await query(
      `SELECT au.*, a.slug, a.name, a.type, a.city, a.country, a.description
         FROM audits au
         JOIN accommodations a ON a.id = au.accommodation_id
        WHERE au.id = :id`,
      { id: req.params.id }
    );
    if (!audit) return res.status(404).json({ error: 'Audit niet gevonden' });

    // All criteria grouped by category (what the auditor walks through).
    const criteria = await query(
      `SELECT c.id, c.code, c.title, c.description, c.points,
              cat.id AS category_id, cat.name AS category, cat.sort AS cat_sort
         FROM criteria c
         JOIN categories cat ON cat.id = c.category_id
        ORDER BY cat.sort, c.sort`
    );
    const categories = [];
    const byCat = new Map();
    for (const c of criteria) {
      if (!byCat.has(c.category_id)) {
        const entry = { id: c.category_id, name: c.category, criteria: [] };
        byCat.set(c.category_id, entry);
        categories.push(entry);
      }
      byCat.get(c.category_id).criteria.push({
        id: c.id, code: c.code, title: c.title, description: c.description, points: c.points,
      });
    }

    const answers = await query(
      'SELECT criterion_id, verdict, note FROM audit_answers WHERE audit_id = :id',
      { id: audit.id }
    );
    const photos = await query(
      'SELECT id, criterion_id, url, public_id FROM audit_photos WHERE audit_id = :id ORDER BY uploaded_at',
      { id: audit.id }
    );

    res.json({ audit, categories, answers, photos });
  } catch (err) { next(err); }
});

// ---- Claim an available audit ----
router.post('/:id/claim', requireAuditor, async (req, res, next) => {
  try {
    const { auditor_name, auditor_email } = req.body || {};
    if (!auditor_name || !auditor_email) {
      return res.status(400).json({ error: 'Naam en e-mailadres van de auditor zijn verplicht' });
    }
    const [audit] = await query('SELECT id, status FROM audits WHERE id = :id', { id: req.params.id });
    if (!audit) return res.status(404).json({ error: 'Audit niet gevonden' });
    if (audit.status !== 'available') {
      return res.status(409).json({ error: 'Deze audit is al geclaimd of afgerond.' });
    }
    await query(
      `UPDATE audits
          SET status = 'claimed', auditor_name = :name, auditor_email = :email, claimed_at = now()
        WHERE id = :id`,
      { name: auditor_name, email: auditor_email, id: audit.id }
    );
    res.json({ claimed: true });
  } catch (err) { next(err); }
});

// ---- Submit the audit (verdicts + photo evidence) ----
router.post('/:id/submit', requireAuditor, async (req, res, next) => {
  try {
    const { outcome, notes } = req.body || {};
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const photos  = Array.isArray(req.body?.photos)  ? req.body.photos  : [];
    if (!['verified', 'rejected'].includes(outcome)) {
      return res.status(400).json({ error: "outcome moet 'verified' of 'rejected' zijn" });
    }

    const [audit] = await query(
      'SELECT id, accommodation_id, status FROM audits WHERE id = :id',
      { id: req.params.id }
    );
    if (!audit) return res.status(404).json({ error: 'Audit niet gevonden' });
    if (!['claimed', 'submitted'].includes(audit.status)) {
      return res.status(409).json({ error: 'Deze audit kan niet meer worden ingediend.' });
    }

    // Validate criterion ids.
    const crit = await query('SELECT id FROM criteria');
    const validCrit = new Set(crit.map((c) => Number(c.id)));

    await withTransaction(async (q) => {
      // Replace previous answers/photos for this audit (idempotent submit).
      await q('DELETE FROM audit_answers WHERE audit_id = :id', { id: audit.id });
      await q('DELETE FROM audit_photos  WHERE audit_id = :id', { id: audit.id });

      for (const a of answers) {
        const cid = Number(a.criterion_id);
        if (!validCrit.has(cid)) continue;
        const verdict = ['pass', 'fail', 'na'].includes(a.verdict) ? a.verdict : 'na';
        await q(
          `INSERT INTO audit_answers (audit_id, criterion_id, verdict, note)
           VALUES (:aid, :cid, :verdict, :note)`,
          { aid: audit.id, cid, verdict, note: a.note || null }
        );
      }

      for (const p of photos) {
        const cid = Number(p.criterion_id);
        if (!validCrit.has(cid) || !p.url) continue;
        await q(
          `INSERT INTO audit_photos (audit_id, criterion_id, url, public_id)
           VALUES (:aid, :cid, :url, :pid)`,
          { aid: audit.id, cid, url: String(p.url).slice(0, 500), pid: p.public_id || null }
        );
      }

      await q(
        `UPDATE audits SET status = 'submitted', notes = :notes, submitted_at = now() WHERE id = :id`,
        { notes: notes || null, id: audit.id }
      );

      // The auditor is the verifier: a 'verified' outcome marks the stay verified.
      if (outcome === 'verified') {
        await q(
          `UPDATE accommodations SET audit_status = 'verified', verified_at = now() WHERE id = :acc`,
          { acc: audit.accommodation_id }
        );
      } else {
        await q(
          `UPDATE accommodations SET audit_status = 'pending', verified_at = NULL WHERE id = :acc`,
          { acc: audit.accommodation_id }
        );
      }
    });

    res.json({ submitted: true, outcome });
  } catch (err) { next(err); }
});

// ---- Optional admin override ----
router.post('/:id/decision', requireAdmin, async (req, res, next) => {
  try {
    const { decision } = req.body || {};
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "decision moet 'approve' of 'reject' zijn" });
    }
    const [audit] = await query(
      'SELECT id, accommodation_id FROM audits WHERE id = :id',
      { id: req.params.id }
    );
    if (!audit) return res.status(404).json({ error: 'Audit niet gevonden' });

    await withTransaction(async (q) => {
      await q(
        `UPDATE audits SET status = :st, decided_at = now() WHERE id = :id`,
        { st: decision === 'approve' ? 'approved' : 'rejected', id: audit.id }
      );
      await q(
        `UPDATE accommodations
            SET audit_status = :as, verified_at = :va
          WHERE id = :acc`,
        {
          as: decision === 'approve' ? 'verified' : 'pending',
          va: decision === 'approve' ? new Date() : null,
          acc: audit.accommodation_id,
        }
      );
    });
    res.json({ decided: decision });
  } catch (err) { next(err); }
});

export default router;
