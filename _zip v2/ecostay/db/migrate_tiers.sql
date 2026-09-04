-- ============================================================
-- Migration: two subscription tiers (self / verified)
-- Run once on the existing Neon database (SQL editor or psql).
--   self     = self-assessment only          → € 2,00 / maand
--   verified = assessment with auditor visit  → € 8,00 / maand
-- ============================================================

-- 1. Tier on the accommodation (which product it pays for).
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'self'
  CHECK (tier IN ('self', 'verified'));

-- 2. Tier stored on each payment and subscription for reporting.
ALTER TABLE billing_payments
  ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'self';

ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'self';
