/**
 * Verblijf-login via magic link + "Mijn verblijf"-dashboard.
 *
 * POST /api/owner/request-link   { email }        Stuurt een magic-link mail.
 * POST /api/owner/verify         { token }        Wisselt token in voor sessie.
 * GET  /api/owner/me                              Verblijf(en) van de ingelogde eigenaar. [owner]
 * PATCH /api/owner/stays/:slug    { ...velden }    Eigen gegevens/foto bijwerken.          [owner]
 * GET  /api/owner/stays/:slug/subscription        Abonnementsstatus.                       [owner]
 * DELETE /api/owner/stays/:slug/subscription      Abonnement opzeggen.                      [owner]
 * POST /api/owner/logout                          Sessie beëindigen.                        [owner]
 */

import { Router } from 'express';
import crypto from 'crypto';
import { query, withTransaction } from '../db.js';
import { requireOwner, hashToken } from '../auth.js';
import { sendEmail, magicLinkEmail, emailConfigured } from '../email.js';
import { renewalOffer, monthsUntil } from '../renewal.js';

const router = Router();

const FRONTEND_URL = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
const TOKEN_TTL_MIN   = 30;          // magic link 30 min geldig
const SESSION_TTL_DAYS = 30;         // sessie 30 dagen geldig

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---- 1. Magic link aanvragen ----
router.post('/request-link', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Vul een geldig e-mailadres in.' });
    }

    // Bestaat er een verblijf met dit e-mailadres? Zo niet, geven we tóch een
    // neutrale melding terug (geen account-enumeratie), maar sturen geen mail.
    const stays = await query(
      'SELECT id FROM accommodations WHERE lower(contact_email) = :email',
      { email }
    );

    if (stays.length > 0) {
      const token = randomToken();
      const expires = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
      await query(
        `INSERT INTO magic_tokens (email, token_hash, expires_at)
         VALUES (:email, :h, :exp)`,
        { email, h: hashToken(token), exp: expires }
      );
      const loginUrl = `${FRONTEND_URL}/inloggen/verifieren?token=${token}`;

      if (emailConfigured()) {
        const { subject, html, text } = magicLinkEmail(loginUrl);
        try {
          await sendEmail({ to: email, subject, html, text });
        } catch (mailErr) {
          // Mail mislukt: log het, maar verklap niets aan de buitenwereld.
          console.error('[owner] magic mail mislukt:', mailErr.message);
        }
      } else {
        // Zonder mailconfig loggen we de link zodat je lokaal kunt testen.
        console.log('[owner] (geen mail geconfigureerd) magic link:', loginUrl);
      }
    }

    // Altijd hetzelfde antwoord — geen hint of het e-mailadres bestaat.
    res.json({ sent: true });
  } catch (err) { next(err); }
});

// ---- 2. Token verifiëren -> sessie ----
router.post('/verify', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token ontbreekt.' });

    const sessionToken = await withTransaction(async (q) => {
      const [mt] = await q(
        `SELECT id, email FROM magic_tokens
          WHERE token_hash = :h AND used_at IS NULL AND expires_at > now()
          LIMIT 1`,
        { h: hashToken(token) }
      );
      if (!mt) return null;

      await q('UPDATE magic_tokens SET used_at = now() WHERE id = :id', { id: mt.id });

      const st = randomToken();
      const exp = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
      await q(
        `INSERT INTO owner_sessions (email, token_hash, expires_at)
         VALUES (:email, :h, :exp)`,
        { email: mt.email, h: hashToken(st), exp }
      );
      return st;
    });

    if (!sessionToken) {
      return res.status(400).json({ error: 'Deze inloglink is ongeldig of verlopen. Vraag een nieuwe aan.' });
    }
    res.json({ token: sessionToken });
  } catch (err) { next(err); }
});

// ---- 3. Verblijf(en) van de ingelogde eigenaar ----
router.get('/me', requireOwner, async (req, res, next) => {
  try {
    const stays = await query(
      `SELECT id, slug, name, type, city, country, description, website,
              contact_email, image_url, score, level, status, tier,
              audit_status, verified_at, certified_at, expires_at
         FROM accommodations
        WHERE lower(contact_email) = :email
        ORDER BY created_at DESC`,
      { email: req.ownerEmail }
    );

    // Voeg per verblijf het herbeoordelingsaanbod toe, plus of er al een
    // herbeoordeling loopt (zodat de UI niet dubbel aanbiedt).
    const enriched = await Promise.all(stays.map(async (s) => {
      const offer = s.status === 'certified' ? renewalOffer(s.expires_at) : null;
      let renewalPending = false;
      if (offer && offer.available) {
        const [open] = await query(
          `SELECT id FROM audits
            WHERE accommodation_id = :acc AND kind = 'renewal'
              AND status IN ('available','claimed','submitted') LIMIT 1`,
          { acc: s.id }
        );
        renewalPending = Boolean(open);
      }
      return { ...s, renewal: offer, renewalPending };
    }));

    res.json({ email: req.ownerEmail, stays: enriched });
  } catch (err) { next(err); }
});

// Helper: hoort dit verblijf bij de ingelogde eigenaar?
async function ownStay(email, slug) {
  const [row] = await query(
    'SELECT id, slug FROM accommodations WHERE slug = :slug AND lower(contact_email) = :email',
    { slug, email }
  );
  return row || null;
}

// ---- 4. Eigen gegevens/foto bijwerken ----
const EDITABLE = ['name', 'type', 'city', 'country', 'description', 'website', 'image_url'];
router.patch('/stays/:slug', requireOwner, async (req, res, next) => {
  try {
    const own = await ownStay(req.ownerEmail, req.params.slug);
    if (!own) return res.status(404).json({ error: 'Verblijf niet gevonden of niet van jou.' });

    const fields = EDITABLE.filter((f) => f in (req.body || {}));
    if (fields.length === 0) return res.status(400).json({ error: 'Geen wijzigbare velden meegegeven.' });

    const set = fields.map((f) => `${f} = :${f}`).join(', ');
    const params = { slug: req.params.slug };
    for (const f of fields) params[f] = req.body[f];

    await query(`UPDATE accommodations SET ${set} WHERE slug = :slug`, params);
    res.json({ updated: true });
  } catch (err) { next(err); }
});

// ---- 5. Abonnementsstatus ----
router.get('/stays/:slug/subscription', requireOwner, async (req, res, next) => {
  try {
    const own = await ownStay(req.ownerEmail, req.params.slug);
    if (!own) return res.status(404).json({ error: 'Verblijf niet gevonden of niet van jou.' });

    const [sub] = await query(
      `SELECT bs.status, bs.amount, bs.currency, bs.tier, bs.next_payment_date
         FROM billing_subscriptions bs
        WHERE bs.accommodation_id = :acc
        ORDER BY bs.created_at DESC LIMIT 1`,
      { acc: own.id }
    );
    res.json({ subscription: sub ? { ...sub, amount: Number(sub.amount) } : null });
  } catch (err) { next(err); }
});

// ---- 6. Abonnement opzeggen ----
router.delete('/stays/:slug/subscription', requireOwner, async (req, res, next) => {
  try {
    const own = await ownStay(req.ownerEmail, req.params.slug);
    if (!own) return res.status(404).json({ error: 'Verblijf niet gevonden of niet van jou.' });

    // Delegeer naar dezelfde logica als de publieke opzeg-route: markeer de
    // subscription als canceled en zet het verblijf terug naar draft.
    const [sub] = await query(
      `SELECT id, mollie_subscription_id, mollie_customer_id
         FROM billing_subscriptions
        WHERE accommodation_id = :acc AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`,
      { acc: own.id }
    );
    if (!sub) return res.status(404).json({ error: 'Geen actief abonnement gevonden.' });

    // Mollie opzeggen (best effort — als het faalt, gaan we lokaal wél door).
    try {
      const { mollie } = await import('../mollie.js');
      if (sub.mollie_subscription_id && sub.mollie_customer_id) {
        await mollie.customerSubscriptions.cancel(sub.mollie_subscription_id, {
          customerId: sub.mollie_customer_id,
        });
      }
    } catch (mErr) {
      console.error('[owner] Mollie opzeggen mislukt:', mErr.message);
    }

    await withTransaction(async (q) => {
      await q(
        `UPDATE billing_subscriptions SET status = 'canceled', updated_at = now() WHERE id = :id`,
        { id: sub.id }
      );
      await q(
        `UPDATE accommodations SET status = 'canceled', canceled_at = now() WHERE id = :acc`,
        { acc: own.id }
      );
    });
    res.json({ canceled: true });
  } catch (err) { next(err); }
});

// ---- 6b. Abonnement wijzigen (upgraden/downgraden self <-> verified) ----
router.post('/stays/:slug/change-tier', requireOwner, async (req, res, next) => {
  try {
    const newTier = req.body?.tier === 'verified' ? 'verified' : 'self';
    const own = await ownStay(req.ownerEmail, req.params.slug);
    if (!own) return res.status(404).json({ error: 'Verblijf niet gevonden of niet van jou.' });

    const [sub] = await query(
      `SELECT id, mollie_subscription_id, mollie_customer_id, tier
         FROM billing_subscriptions
        WHERE accommodation_id = :acc AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`,
      { acc: own.id }
    );
    if (!sub) {
      return res.status(404).json({ error: 'Geen actief abonnement om te wijzigen. Start eerst een certificering.' });
    }
    if (sub.tier === newTier) {
      return res.json({ changed: false, tier: newTier, message: 'Je zit al op dit abonnement.' });
    }

    const { mollie, tierFor, CURRENCY, mollieConfigured } = await import('../mollie.js');
    const tier = tierFor(newTier);

    // Pas het bedrag van het lopende Mollie-abonnement aan. Lukt dit niet, dan
    // wijzigen we onze database ook niet (zodat beide in sync blijven).
    // Zonder geconfigureerde Mollie-sleutel slaan we deze stap over (lokaal-only,
    // consistent met hoe e-mail/uploads degraderen als hun dienst ontbreekt).
    if (mollieConfigured() && sub.mollie_subscription_id && sub.mollie_customer_id) {
      try {
        await mollie.customerSubscriptions.update(sub.mollie_subscription_id, {
          customerId: sub.mollie_customer_id,
          amount: { currency: CURRENCY, value: tier.amount },
          description: `${tier.description} maandabonnement`,
        });
      } catch (mErr) {
        console.error('[owner] Mollie abonnement wijzigen mislukt:', mErr.message);
        return res.status(502).json({ error: 'Het abonnement kon niet bij de betaalprovider worden aangepast. Probeer het later opnieuw.' });
      }
    }

    await withTransaction(async (q) => {
      await q(
        `UPDATE billing_subscriptions SET amount = :amount, tier = :tier, updated_at = now() WHERE id = :id`,
        { amount: tier.amount, tier: newTier, id: sub.id }
      );
      await q('UPDATE accommodations SET tier = :tier WHERE id = :acc', { tier: newTier, acc: own.id });

      // Bij upgrade naar verified: maak een audit aan als het verblijf al
      // gecertificeerd is en er nog geen open audit loopt.
      if (newTier === 'verified') {
        const [acc] = await q('SELECT level, audit_status FROM accommodations WHERE id = :acc', { acc: own.id });
        if (acc && acc.level > 0 && acc.audit_status === 'none') {
          const [openAudit] = await q(
            `SELECT id FROM audits WHERE accommodation_id = :acc AND status IN ('available','claimed','submitted') LIMIT 1`,
            { acc: own.id }
          );
          if (!openAudit) {
            await q(`INSERT INTO audits (accommodation_id, status) VALUES (:acc, 'available')`, { acc: own.id });
            await q(`UPDATE accommodations SET audit_status = 'pending' WHERE id = :acc`, { acc: own.id });
          }
        }
      }
    });

    res.json({ changed: true, tier: newTier });
  } catch (err) { next(err); }
});

// ---- 6c. Herbeoordeling aanvragen ----
// Maakt een renewal-audit met de dynamische vergoeding. Een auditor pikt 'm op;
// bij goedkeuring wordt de geldigheid met 12 maanden verlengd (zie audits.js).
router.post('/stays/:slug/request-renewal', requireOwner, async (req, res, next) => {
  try {
    const [own] = await query(
      `SELECT id, status, expires_at FROM accommodations
        WHERE slug = :slug AND lower(contact_email) = :email`,
      { slug: req.params.slug, email: req.ownerEmail }
    );
    if (!own) return res.status(404).json({ error: 'Verblijf niet gevonden of niet van jou.' });
    if (own.status !== 'certified') {
      return res.status(400).json({ error: 'Alleen een gecertificeerd verblijf kan een herbeoordeling aanvragen.' });
    }

    const offer = renewalOffer(own.expires_at);
    if (!offer || !offer.available) {
      return res.status(400).json({ error: 'Herbeoordeling is nu nog niet beschikbaar (kan vanaf 1 jaar voor verloop).' });
    }

    // Loopt er al een herbeoordeling? Dan niet dubbel aanmaken.
    const [open] = await query(
      `SELECT id FROM audits
        WHERE accommodation_id = :acc AND kind = 'renewal'
          AND status IN ('available','claimed','submitted') LIMIT 1`,
      { acc: own.id }
    );
    if (open) return res.status(409).json({ error: 'Er loopt al een herbeoordeling voor dit verblijf.' });

    const [audit] = await query(
      `INSERT INTO audits (accommodation_id, status, kind, fee)
       VALUES (:acc, 'available', 'renewal', :fee)
       RETURNING id`,
      { acc: own.id, fee: offer.price }
    );
    await query(`UPDATE accommodations SET audit_status = 'pending' WHERE id = :acc`, { acc: own.id });

    res.status(201).json({ requested: true, auditId: audit.id, price: offer.price });
  } catch (err) { next(err); }
});

// ---- 7. Uitloggen ----
router.post('/logout', requireOwner, async (req, res, next) => {
  try {
    const token = req.get('x-owner-token') || '';
    if (token) await query('DELETE FROM owner_sessions WHERE token_hash = :h', { h: hashToken(token) });
    res.json({ loggedOut: true });
  } catch (err) { next(err); }
});

export default router;
