/**
 * GET  /api/subscriptions/:slug
 *   Returns the active subscription (if any) for a given accommodation slug.
 *
 * DELETE /api/subscriptions/:slug
 *   Cancels the active Mollie subscription and marks it canceled locally.
 *   The accommodation stays in the database but its status reverts to 'draft'.
 */

import { Router } from 'express';
import { query } from '../db.js';
import { mollie } from '../mollie.js';

const router = Router();

// ---- Subscription status ----
router.get('/:slug', async (req, res, next) => {
  try {
    const [stay] = await query(
      'SELECT id FROM accommodations WHERE slug = :slug',
      { slug: req.params.slug }
    );
    if (!stay) return res.status(404).json({ error: 'Verblijf niet gevonden' });

    const [sub] = await query(
      `SELECT bs.mollie_subscription_id, bs.status, bs.amount, bs.currency,
              bs.interval, bs.next_payment_date, bs.started_at, bs.canceled_at
         FROM billing_subscriptions bs
        WHERE bs.accommodation_id = :acc
        ORDER BY bs.created_at DESC LIMIT 1`,
      { acc: stay.id }
    );

    if (!sub) return res.json({ subscription: null });

    res.json({
      subscription: {
        ...sub,
        amount: Number(sub.amount),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---- Cancel subscription ----
router.delete('/:slug', async (req, res, next) => {
  try {
    const [stay] = await query(
      'SELECT id FROM accommodations WHERE slug = :slug',
      { slug: req.params.slug }
    );
    if (!stay) return res.status(404).json({ error: 'Verblijf niet gevonden' });

    const [sub] = await query(
      `SELECT mollie_subscription_id, mollie_customer_id
         FROM billing_subscriptions
        WHERE accommodation_id = :acc AND status = 'active'
        ORDER BY created_at DESC LIMIT 1`,
      { acc: stay.id }
    );

    if (!sub) {
      return res.status(404).json({ error: 'Geen actief abonnement gevonden' });
    }

    // Cancel at Mollie.
    await mollie.customerSubscriptions.cancel({
      customerId:     sub.mollie_customer_id,
      subscriptionId: sub.mollie_subscription_id,
    });

    // Mark canceled locally and revert accommodation to draft.
    await query(
      `UPDATE billing_subscriptions
          SET status = 'canceled', canceled_at = now(), updated_at = now()
        WHERE mollie_subscription_id = :sub`,
      { sub: sub.mollie_subscription_id }
    );

    // Mark accommodation as canceled with timestamp — not deleted, stays visible.
    await query(
      `UPDATE accommodations
          SET status = 'canceled', canceled_at = now()
        WHERE id = :acc`,
      { acc: stay.id }
    );

    res.json({ canceled: true });
  } catch (err) {
    next(err);
  }
});

export default router;
