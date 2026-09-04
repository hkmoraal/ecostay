import { Router } from 'express';
import { query } from '../db.js';
import { levelInfo } from '../scoring.js';

const router = Router();

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 130);
}

// GET /api/accommodations?level=&status=&q=
// Public directory. Defaults to certified stays only.
router.get('/', async (req, res, next) => {
  try {
    const { level, q } = req.query;
    // Default: show all statuses except hard-deleted (there is no delete).
    // invited + draft = visible but no leaves (gray)
    // certified = green with leaves
    // canceled = grayed out with end date
    // Pass ?status=certified for only certified, ?status=all for everything.
    const statusParam = req.query.status;
    const where = [];
    const params = {};

    if (statusParam === 'certified') {
      where.push("status = 'certified'");
    } else if (statusParam && statusParam !== 'all') {
      where.push('status = :status');
      params.status = statusParam;
    }
    // default (no param): all statuses are shown
    if (level != null && level !== '') {
      where.push('level = :level');
      params.level = Number(level);
    }
    if (q) {
      where.push('(name ILIKE :q OR city ILIKE :q OR country ILIKE :q)');
      params.q = `%${q}%`;
    }
    const sql =
      `SELECT id, slug, name, type, city, country, description, website,
              image_url, score, level, status, tier, audit_status, verified_at,
              updated_at, canceled_at, invited_at
         FROM accommodations
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY level DESC, score DESC, name ASC`;
    const rows = await query(sql, params);
    res.json({ stays: rows.map(decorate) });
  } catch (err) {
    next(err);
  }
});

// GET /api/accommodations/:slug — detail incl. which criteria were met.
router.get('/:slug', async (req, res, next) => {
  try {
    const [stay] = await query(
      `SELECT id, slug, name, type, city, country, description, website,
              contact_email, image_url, score, level, status, tier,
              audit_status, verified_at, certified_at, expires_at,
              created_at, updated_at, canceled_at
         FROM accommodations WHERE slug = :slug`,
      { slug: req.params.slug }
    );
    if (!stay) return res.status(404).json({ error: 'Accommodatie niet gevonden' });

    const met = await query(
      `SELECT c.id, c.code, c.title, c.points, cat.name AS category
         FROM assessment_answers aa
         JOIN criteria c     ON c.id = aa.criterion_id
         JOIN categories cat ON cat.id = c.category_id
        WHERE aa.met = TRUE
          AND aa.assessment_id = (
            SELECT id FROM assessments
             WHERE accommodation_id = :id
             ORDER BY submitted_at DESC, id DESC
             LIMIT 1
          )
        ORDER BY cat.sort, c.sort`,
      { id: stay.id }
    );
    res.json({ stay: { ...decorate(stay), met } });
  } catch (err) {
    next(err);
  }
});

// POST /api/accommodations — register a place (starts as draft).
router.post('/', async (req, res, next) => {
  try {
    const { name, type, city, country, description, website, contact_email, image_url } = req.body || {};
    if (!name || !city) {
      return res.status(400).json({ error: 'Naam en plaats zijn verplicht' });
    }
    const base = slugify(name);
    let slug = base;
    let n = 2;
    // eslint-disable-next-line no-await-in-loop
    while ((await query('SELECT id FROM accommodations WHERE slug = :slug', { slug })).length) {
      slug = `${base}-${n++}`;
    }
    const rows = await query(
      `INSERT INTO accommodations (slug, name, type, city, country, description, website, contact_email, image_url)
       VALUES (:slug, :name, :type, :city, :country, :description, :website, :contact_email, :image_url)
       RETURNING id, slug`,
      {
        slug,
        name,
        type: type || 'B&B',
        city,
        country: country || 'Nederland',
        description: description || null,
        website: website || null,
        contact_email: contact_email || null,
        image_url: image_url || null,
      }
    );
    res.status(201).json({ id: rows[0].id, slug: rows[0].slug });
  } catch (err) {
    next(err);
  }
});

function decorate(row) {
  const info = levelInfo(row.level);
  return {
    ...row,
    score: Number(row.score),
    levelKey: info.key,
    levelLabel: info.label,
  };
}

export default router;
