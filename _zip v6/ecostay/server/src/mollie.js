import { createMollieClient } from '@mollie/api-client';

// MOLLIE_API_KEY       – set to test_xxx during development, live_xxx in production.
// MOLLIE_PRICE_SELF     – monthly price for self-assessment tier   (default 2.00)
// MOLLIE_PRICE_VERIFIED – monthly price for verified-assessment tier (default 8.00)
// APP_URL              – public base URL for redirect + webhook (e.g. https://ecostay-zqcu.onrender.com)

if (!process.env.MOLLIE_API_KEY) {
  console.warn('[mollie] MOLLIE_API_KEY is niet ingesteld — betalingen werken niet.');
}

export const mollie = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY || 'test_placeholder',
});

// ---- Two subscription tiers ----
// self     = self-assessment only          → € 2,00 / maand
// verified = assessment with auditor visit  → € 8,00 / maand
export const PRICE_SELF     = process.env.MOLLIE_PRICE_SELF     || '2.00';
export const PRICE_VERIFIED = process.env.MOLLIE_PRICE_VERIFIED || '8.00';

export const TIERS = {
  self: {
    key:   'self',
    label: 'Self-assessment',
    amount: PRICE_SELF,
    description: 'Ecostay self-assessment',
  },
  verified: {
    key:   'verified',
    label: 'Verified assessment',
    amount: PRICE_VERIFIED,
    description: 'Ecostay verified assessment',
  },
};

// Return the tier config for a given key, defaulting to 'self'.
export function tierFor(key) {
  return TIERS[key] || TIERS.self;
}

export const CURRENCY              = 'EUR';
export const SUBSCRIPTION_INTERVAL = '1 month';
export const APP_URL               = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
export const FRONTEND_URL          = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
