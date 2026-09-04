-- Migratie: canceled status + einddatum op accommodations
-- Uitvoeren op je bestaande Neon-database via de SQL Editor.
-- Veilig om meerdere keren te draaien (IF NOT EXISTS / IF EXISTS).

-- 1. Verwijder de oude CHECK constraint
ALTER TABLE accommodations
  DROP CONSTRAINT IF EXISTS accommodations_status_check;

-- 2. Voeg de nieuwe toe met 'canceled' erbij
ALTER TABLE accommodations
  ADD CONSTRAINT accommodations_status_check
  CHECK (status IN ('draft', 'certified', 'canceled'));

-- 3. Voeg de canceled_at kolom toe
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Klaar. Controleer met:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'accommodations' ORDER BY ordinal_position;

-- Uitbreiding: invited status + draft zichtbaar in overzicht
-- (voeg toe aan dezelfde migratie)

ALTER TABLE accommodations
  DROP CONSTRAINT IF EXISTS accommodations_status_check;

ALTER TABLE accommodations
  ADD CONSTRAINT accommodations_status_check
  CHECK (status IN ('invited', 'draft', 'certified', 'canceled'));

-- invited_at: moment waarop de uitnodiging is verstuurd
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- invited_by: e-mail of naam van de persoon die de uitnodiging stuurde
ALTER TABLE accommodations
  ADD COLUMN IF NOT EXISTS invited_by VARCHAR(180);
