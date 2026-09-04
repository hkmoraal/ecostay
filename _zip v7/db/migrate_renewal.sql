-- ============================================================
-- Migration: certificaatgeldigheid + herbeoordeling (renewal)
-- Run once on the existing Neon database.
-- ============================================================

-- Wanneer het certificaat is behaald en wanneer het verloopt (1 jaar geldig).
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ NULL;
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ NULL;

-- Onderscheid gewone audits van herbeoordelingen, en leg de vergoeding vast.
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS kind VARCHAR(10) NOT NULL DEFAULT 'initial'
  CHECK (kind IN ('initial', 'renewal'));
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS fee NUMERIC(8,2) NULL;

-- Bestaande gecertificeerde verblijven een geldigheid geven vanaf nu (1 jaar),
-- zodat de herbeoordeling ook voor hen gaat werken.
UPDATE accommodations
   SET certified_at = COALESCE(certified_at, now()),
       expires_at   = COALESCE(expires_at, now() + interval '12 months')
 WHERE status = 'certified' AND expires_at IS NULL;
