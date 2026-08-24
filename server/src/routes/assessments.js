import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { computeScore, levelInfo } from '../scoring.js';

const router = Router();

// POST /api/accommodations/:slug/assessment
// Body: { metIds: number[] }  -> the criterion ids the owner ticked.
// Computes the score, stores the assessment + answers, updates the stay.
router.post('/:slug/assessment', async (req, res, next) => {
  try {
    const metIds = Array.isArray(req.body?.metIds) ? req.body.metIds : [];

    const [stay] = await query(
      'SELECT id FROM accommodations WHERE slug = :slug',
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
            SET score = :score, level = :level, status = :status
          WHERE id = :acc`,
        { score, level, status: level > 0 ? 'certified' : 'draft', acc: stay.id }
      );
      return id;
    });

    const info = levelInfo(level);
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
