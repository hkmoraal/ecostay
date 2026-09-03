/**
 * POST /api/invitations
 *   Creates an accommodation with status 'invited'.
 *   Body: { name, type, city, country, website, contact_email, invited_by }
 *   In a real deployment this would also send an email to contact_email.
 *
 * GET /api/invitations
 *   Lists all invited + draft stays (for an admin overview).
 */

import { Router } from 'express';
import { query } from '../db.js';

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

// ---- Send an invitation ----
router.post('/', async (req, res, next) => {
  try {
    const { name, type, city, country, website, contact_email, invited_by } = req.body || {};
    if (!name || !city) {
      return res.status(400).json({ error: 'Naam en plaats zijn verplicht' });
    }

    const base = slugify(name);
    let slug = base;
    let n = 2;
    while ((await query('SELECT id FROM accommodations WHERE slug = :slug', { slug })).length) {
      slug = `${base}-${n++}`;
    }

    const rows = await query(
      `INSERT INTO accommodations
         (slug, name, type, city, country, website, contact_email,
          status, invited_at, invited_by)
       VALUES
         (:slug, :name, :type, :city, :country, :website, :contact_email,
          'invited', now(), :invited_by)
       RETURNING id, slug`,
      {
        slug,
        name,
        type: type || 'B&B',
        city,
        country: country || 'Nederland',
        website: website || null,
        contact_email: contact_email || null,
        invited_by: invited_by || null,
      }
    );

    // TODO: send invitation email to contact_email with link to /certificering?slug=<slug>

    res.status(201).json({
      id: rows[0].id,
      slug: rows[0].slug,
      certifyUrl: `/certificering?invited=${rows[0].slug}`,
    });
  } catch (err) {
    next(err);
  }
});

// ---- Admin overview: invited + draft ----
router.get('/', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT id, slug, name, type, city, country, contact_email,
              status, invited_at, invited_by, created_at
         FROM accommodations
        WHERE status IN ('invited', 'draft')
        ORDER BY invited_at DESC NULLS LAST, created_at DESC`
    );
    res.json({ stays: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
