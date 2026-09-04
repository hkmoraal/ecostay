/**
 * POST /api/payments/start/:slug
 *   Creates a Mollie customer + first payment.
 *   Returns the Mollie checkout URL; the frontend redirects the browser there.
 *   Body: { email, name, tier }   tier = 'self' | 'verified'
 *
 * POST /api/payments/webhook
 *   Called by Mollie when a payment status changes.
 *   On paid first payment → creates a subscription at the same tier amount.
 *
 * GET  /api/payments/return/:slug
 *   Landing page after the customer returns from Mollie.
 *   Redirects to the frontend with ?payment=<status>.
 */

import { Router } from 'express';
import { query } from '../db.js';
import {
  mollie, tierFor, CURRENCY,
  SUBSCRIPTION_INTERVAL, APP_URL, FRONTEND_URL,
} from '../mollie.js';

const router = Router();

// ---- 1. Start first payment ----
router.post('/start/:slug', async (req, res, next) => {
  try {
    const { email, name, tier: tierKey } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'Naam en e-mailadres zijn verplicht' });
    }

    const tier = tierFor(tierKey);

    const [stay] = await query(
      'SELECT id, name FROM accommodations WHERE slug = :slug',
      { slug: req.params.slug }
    );
    if (!stay) return res.status(404).json({ error: 'Verblijf niet gevonden' });

    // Remember which tier this accommodation chose.
    await query(
      'UPDATE accommodations SET tier = :tier WHERE id = :id',
      { tier: tier.key, id: stay.id }
    );

    // Re-use existing Mollie customer if the accommodation already paid before.
    let mollieCustomerId;
    const [existing] = await query(
      'SELECT mollie_customer_id FROM billing_customers WHERE accommodation_id = :id',
      { id: stay.id }
    );

    if (existing) {
      mollieCustomerId = existing.mollie_customer_id;
    } else {
      const customer = await mollie.customers.create({ name, email });
      mollieCustomerId = customer.id;
      await query(
        `INSERT INTO billing_customers (accommodation_id, mollie_customer_id, email)
         VALUES (:acc, :cust, :email)`,
        { acc: stay.id, cust: mollieCustomerId, email }
      );
    }

    // Create the first payment (sequenceType: first = mandaat + betaling).
    const payment = await mollie.payments.create({
      amount:       { currency: CURRENCY, value: tier.amount },
      customerId:   mollieCustomerId,
      sequenceType: 'first',
      description:  `Ecostay — ${stay.name} — ${tier.label} (eerste maand)`,
      redirectUrl:  `${APP_URL}/api/payments/return/${req.params.slug}`,
      webhookUrl:   `${APP_URL}/api/payments/webhook`,
      metadata:     { accommodationId: stay.id, slug: req.params.slug, tier: tier.key },
    });

    // Save the payment so the webhook can look it up.
    await query(
      `INSERT INTO billing_payments
         (accommodation_id, mollie_payment_id, mollie_customer_id, sequence_type, status, amount, currency, tier)
       VALUES (:acc, :pid, :cust, 'first', :status, :amount, :currency, :tier)`,
      {
        acc:      stay.id,
        pid:      payment.id,
        cust:     mollieCustomerId,
        status:   payment.status,
        amount:   tier.amount,
        currency: CURRENCY,
        tier:     tier.key,
      }
    );

    // Send the checkout URL back; the frontend redirects the browser there.
    res.json({ checkoutUrl: payment.getCheckoutUrl() });
  } catch (err) {
    next(err);
  }
});

// ---- 2. Mollie webhook ----
router.post('/webhook', async (req, res) => {
  // Always respond 200 immediately so Mollie doesn't retry.
  res.sendStatus(200);

  const molliePaymentId = req.body?.id;
  if (!molliePaymentId) return;

  try {
    const payment = await mollie.payments.get(molliePaymentId);

    // Update our local payment record.
    await query(
      `UPDATE billing_payments SET status = :status, updated_at = now()
        WHERE mollie_payment_id = :pid`,
      { status: payment.status, pid: molliePaymentId }
    );

    // Only act on paid first payments.
    if (payment.status !== 'paid' || payment.sequenceType !== 'first') return;

    const [bp] = await query(
      `SELECT accommodation_id, mollie_customer_id, amount, tier
         FROM billing_payments WHERE mollie_payment_id = :pid`,
      { pid: molliePaymentId }
    );
    if (!bp) return;

    // Check we don't already have an active subscription.
    const [existing] = await query(
      `SELECT id FROM billing_subscriptions
        WHERE accommodation_id = :acc AND status = 'active'`,
      { acc: bp.accommodation_id }
    );
    if (existing) return;

    const tier = tierFor(bp.tier);

    // Create the subscription — starts next month (first month already paid).
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const startDate = nextMonth.toISOString().slice(0, 10);

    const subscription = await mollie.customerSubscriptions.create({
      customerId:  bp.mollie_customer_id,
      amount:      { currency: CURRENCY, value: tier.amount },
      interval:    SUBSCRIPTION_INTERVAL,
      startDate,
      description: `${tier.description} maandabonnement`,
      webhookUrl:  `${APP_URL}/api/payments/webhook`,
    });

    await query(
      `INSERT INTO billing_subscriptions
         (accommodation_id, mollie_customer_id, mollie_subscription_id,
          status, amount, currency, interval, tier, started_at, next_payment_date)
       VALUES (:acc, :cust, :sub, 'active', :amount, :currency, :interval, :tier, now(), :next)`,
      {
        acc:      bp.accommodation_id,
        cust:     bp.mollie_customer_id,
        sub:      subscription.id,
        amount:   tier.amount,
        currency: CURRENCY,
        interval: SUBSCRIPTION_INTERVAL,
        tier:     tier.key,
        next:     startDate,
      }
    );
  } catch (err) {
    console.error('[webhook]', err.message);
  }
});

// ---- 3. Return after checkout ----
router.get('/return/:slug', async (req, res) => {
  // Mollie doesn't pass the payment status in the redirect URL; we look it up.
  try {
    const [bp] = await query(
      `SELECT bp.status
         FROM billing_payments bp
         JOIN accommodations a ON a.id = bp.accommodation_id
        WHERE a.slug = :slug AND bp.sequence_type = 'first'
        ORDER BY bp.created_at DESC LIMIT 1`,
      { slug: req.params.slug }
    );
    const status = bp?.status || 'unknown';
    res.redirect(`${FRONTEND_URL}/certificering?payment=${status}&slug=${req.params.slug}`);
  } catch {
    res.redirect(`${FRONTEND_URL}/certificering?payment=error`);
  }
});

export default router;
