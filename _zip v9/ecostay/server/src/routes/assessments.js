import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { computeScore, levelInfo } from '../scoring.js';
import { sendEmail, certifiedEmail, emailConfigured } from '../email.js';

const router = Router();

const FRONTEND_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');

// POST /api/accommodations/:slug/assessment
// Body: { metIds: number[] }  -> the criterion ids the owner ticked.
// Computes the score, stores the assessment + answers, updates the stay.
router.post('/:slug/assessment', async (req, res, next) => {
  try {
    const metIds = Array.isArray(req.body?.metIds) ? req.body.metIds : [];

    const [stay] = await query(
      'SELECT id, name, slug, contact_email FROM accommodations WHERE slug = :slug',
      { slug: req.params.slug }
    );
    if (!stay) return res.status(404).json({ error: 'Accommodatie niet gevonden' });

    const criteria = await query('SELECT id, points FROM criteria');
    const validIds = new Set(criteria.map((c) => Number(c.id)));
    const cleanMet = metIds.map(Number).filter((id) => validIds.has(id));

    const { score, level, gotPoints, totalPoints } = computeScore(criteria, cleanMet);

    const assessmentId = await withTransaction(async (q) => {
      const insRows = await q(
        `INSERT INTO assessments (accommodation_id, score, level)
         VALUES (:acc, :score, :level) RETURNING id`,
        { acc: stay.id, score, level }
      );
      const id = insRows[0].id;

      if (cleanMet.length) {
        const values = cleanMet.map((cid) => `(${id}, ${cid}, TRUE)`).join(',');
        await q(
          `INSERT INTO assessment_answers (assessment_id, criterion_id, met) VALUES ${values}`
        );
      }

      await q(
        `UPDATE accommodations
            SET score = :score, level = :level, status = :status,
                certified_at = CASE WHEN :setCert THEN COALESCE(certified_at, now()) ELSE certified_at END,
                expires_at   = CASE WHEN :setCert THEN COALESCE(expires_at, now() + interval '12 months') ELSE expires_at END
          WHERE id = :acc`,
        { score, level, status: level > 0 ? 'certified' : 'draft', setCert: level > 0, acc: stay.id }
      );

      // Verified-tier stays that reach a certifiable level need an on-site
      // audit. Create one (status 'available') the first time — auditors pick
      // it up from the auditor area. Mark the stay's audit as pending.
      if (level > 0) {
        const [acc] = await q(
          'SELECT tier, audit_status FROM accommodations WHERE id = :acc',
          { acc: stay.id }
        );
        if (acc && acc.tier === 'verified' && acc.audit_status === 'none') {
          const [openAudit] = await q(
            `SELECT id FROM audits
              WHERE accommodation_id = :acc AND status IN ('available','claimed','submitted')
              LIMIT 1`,
            { acc: stay.id }
          );
          if (!openAudit) {
            await q(
              `INSERT INTO audits (accommodation_id, status) VALUES (:acc, 'available')`,
              { acc: stay.id }
            );
            await q(
              `UPDATE accommodations SET audit_status = 'pending' WHERE id = :acc`,
              { acc: stay.id }
            );
          }
        }
      }
      return id;
    });

    const info = levelInfo(level);

    // Certificaat behaald? Stuur een felicitatiemail (best effort).
    if (level > 0) {
      try {
        if (stay.contact_email && emailConfigured()) {
          const { subject, html, text } = certifiedEmail(
            stay.name, info.label, `${FRONTEND_URL}/verblijf/${stay.slug}`
          );
          await sendEmail({ to: stay.contact_email, subject, html, text });
        }
      } catch (mailErr) {
        console.error('[assessment] certificaatmail mislukt:', mailErr.message);
      }
    }

    res.status(201).json({
      assessmentId,
      score,
      level,
      levelKey: info.key,
      levelLabel: info.label,
      gotPoints,
      totalPoints,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
