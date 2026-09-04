import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/criteria
// The self-assessment form needs criteria grouped by category, in order.
router.get('/', async (req, res, next) => {
  try {
    const cats = await query(
      'SELECT id, slug, name, intro FROM categories ORDER BY sort, id'
    );
    const crit = await query(
      `SELECT id, category_id, code, title, description, points
         FROM criteria ORDER BY sort, id`
    );
    const byCat = new Map(cats.map((c) => [c.id, { ...c, criteria: [] }]));
    for (const item of crit) {
      byCat.get(item.category_id)?.criteria.push(item);
    }
    res.json({ categories: [...byCat.values()] });
  } catch (err) {
    next(err);
  }
});

export default router;
