import { createMollieClient } from '@mollie/api-client';

// MOLLIE_API_KEY  – set to test_xxx during development, live_xxx in production.
// MOLLIE_AMOUNT   – monthly subscription price in euros (default 29.00)
// APP_URL         – public base URL for redirect + webhook (e.g. https://ecostay-zqcu.onrender.com)

if (!process.env.MOLLIE_API_KEY) {
  console.warn('[mollie] MOLLIE_API_KEY is niet ingesteld — betalingen werken niet.');
}

export const mollie = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY || 'test_placeholder',
});

export const MONTHLY_AMOUNT   = process.env.MOLLIE_AMOUNT   || '29.00';
export const CURRENCY         = 'EUR';
export const SUBSCRIPTION_INTERVAL = '1 month';
export const APP_URL          = (process.env.APP_URL || 'http://localhost:4000').replace(/\/$/, '');
export const FRONTEND_URL     = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
