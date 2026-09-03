-- Ecostay — seed data (PostgreSQL). Run after schema.sql.
SET client_encoding = 'UTF8';

-- ---------- Categories ----------
INSERT INTO categories (id, slug, name, intro, sort) VALUES
  (1, 'energie',    'Energie',          'Verbruik, opwekking en isolatie.',           1),
  (2, 'water',      'Water',            'Besparen, hergebruik en afvalwater.',        2),
  (3, 'afval',      'Afval & inkoop',   'Minder, hergebruik en bewuste inkoop.',      3),
  (4, 'eten',       'Eten & drinken',   'Lokaal, seizoensgebonden en plantaardig.',   4),
  (5, 'mobiliteit', 'Mobiliteit',       'Bereikbaarheid zonder auto.',                5),
  (6, 'natuur',     'Natuur & sociaal', 'Groen op locatie en de lokale gemeenschap.', 6);

-- ---------- Criteria ----------
INSERT INTO criteria (category_id, code, title, description, points, sort) VALUES
  (1, 'EN-01', 'Groene stroom',               '100% hernieuwbare elektriciteit via contract of eigen opwek.', 3, 1),
  (1, 'EN-02', 'Zonnepanelen',                'Eigen zonne-energie op het dak.',                              2, 2),
  (1, 'EN-03', 'LED-verlichting',             'Minstens 90% van de verlichting is LED.',                      1, 3),
  (1, 'EN-04', 'Slimme thermostaat',          'Verwarming per ruimte regelbaar en/of aanwezigheidsdetectie.', 2, 4),
  (2, 'WA-01', 'Waterbesparende kranen',      'Perlatoren of debietbegrenzers op alle kranen en douches.',    1, 1),
  (2, 'WA-02', 'Regenwateropvang',            'Regenwater voor tuin of toiletten.',                           2, 2),
  (2, 'WA-03', 'Handdoekenbeleid',            'Gasten kiezen zelf of handdoeken dagelijks gewassen worden.',  1, 3),
  (3, 'AF-01', 'Afval scheiden',              'Scheiding van gft, papier, glas en plastic voor gasten.',      2, 1),
  (3, 'AF-02', 'Geen wegwerp-toiletartikelen','Navulbare dispensers in plaats van mini-flesjes.',             2, 2),
  (3, 'AF-03', 'Lokale leveranciers',         'Inkoop bij leveranciers binnen 50 km waar mogelijk.',          1, 3),
  (4, 'ET-01', 'Lokaal ontbijt',              'Ontbijtproducten overwegend lokaal en seizoensgebonden.',      2, 1),
  (4, 'ET-02', 'Plantaardig aanbod',          'Volwaardig vegetarisch/vegan ontbijt beschikbaar.',            2, 2),
  (4, 'ET-03', 'Kraanwater aangeboden',       'Geen flessenwater; kraanwater actief aangeboden.',             1, 3),
  (5, 'MO-01', 'Bereikbaar met OV',           'Binnen 1 km van een halte of station.',                        2, 1),
  (5, 'MO-02', 'Fietsen te leen',             'Gratis of goedkope leenfietsen voor gasten.',                  2, 2),
  (5, 'MO-03', 'Laadpunt',                    'Laadpunt voor elektrische auto of fiets.',                     1, 3),
  (6, 'NA-01', 'Groene tuin',                 'Inheemse beplanting, geen gif, ruimte voor biodiversiteit.',   2, 1),
  (6, 'NA-02', 'Lokale samenwerking',         'Werkt samen met lokale ondernemers of natuurorganisaties.',    1, 2),
  (6, 'NA-03', 'Transparante communicatie',   'Duurzaamheidsbeleid staat openbaar op de website.',            1, 3);

-- ---------- Demo accommodations ----------
INSERT INTO accommodations (id, slug, name, type, city, country, description, website, contact_email) VALUES
  (1, 'de-groene-hoeve', 'De Groene Hoeve', 'B&B', 'Gandia', 'Spanje',
     'Rustieke B&B tussen de sinaasappelgaarden, volledig op zonne-energie.',
     'https://degroenehoeve.example', 'hallo@degroenehoeve.example'),
  (2, 'stadslogies-mint', 'Stadslogies Mint', 'Hotel', 'Utrecht', 'Nederland',
     'Klein stadshotel aan de gracht, focus op afvalvrij en lokaal ontbijt.',
     'https://mint.example', 'boeking@mint.example'),
  (3, 'duinhuis-terschelling', 'Duinhuis Terschelling', 'Vakantiehuis', 'Terschelling', 'Nederland',
     'Familiehuis in de duinen met leenfietsen en regenwateropvang.',
     'https://duinhuis.example', 'info@duinhuis.example'),
  (4, 'boshut-ardennen', 'Boshut Ardennen', 'Camping', 'Durbuy', 'België',
     'Off-grid boshutten, composttoiletten en eigen moestuin.',
     'https://boshut.example', 'welkom@boshut.example');

-- ---------- Demo assessments ----------
INSERT INTO assessments (id, accommodation_id) VALUES (1, 1), (2, 2), (3, 3), (4, 4);

INSERT INTO assessment_answers (assessment_id, criterion_id, met)
  SELECT 1, id, TRUE FROM criteria WHERE code IN
    ('EN-01','EN-02','EN-03','EN-04','WA-01','WA-02','WA-03','AF-02','AF-03',
     'ET-01','ET-02','ET-03','MO-02','NA-01','NA-03');
INSERT INTO assessment_answers (assessment_id, criterion_id, met)
  SELECT 2, id, TRUE FROM criteria WHERE code IN
    ('EN-01','EN-03','WA-01','WA-03','AF-01','AF-02','ET-01','ET-03','MO-01','NA-03');
INSERT INTO assessment_answers (assessment_id, criterion_id, met)
  SELECT 3, id, TRUE FROM criteria WHERE code IN
    ('EN-03','WA-01','WA-02','AF-01','ET-03','MO-02');
INSERT INTO assessment_answers (assessment_id, criterion_id, met)
  SELECT 4, id, TRUE FROM criteria WHERE code IN
    ('EN-01','EN-02','EN-03','WA-01','WA-02','AF-01','AF-02','AF-03',
     'ET-01','ET-02','ET-03','MO-02','MO-03','NA-01','NA-02','NA-03');

-- Compute score (0..100) and level (thresholds 40/60/80) per assessment.
UPDATE assessments a
SET score = ROUND(100.0 * s.got / t.total, 2),
    level = CASE
      WHEN 100.0 * s.got / t.total >= 80 THEN 3
      WHEN 100.0 * s.got / t.total >= 60 THEN 2
      WHEN 100.0 * s.got / t.total >= 40 THEN 1
      ELSE 0 END
FROM (
  SELECT aa.assessment_id, SUM(c.points) AS got
  FROM assessment_answers aa
  JOIN criteria c ON c.id = aa.criterion_id
  WHERE aa.met = TRUE
  GROUP BY aa.assessment_id
) s,
(SELECT SUM(points) AS total FROM criteria) t
WHERE s.assessment_id = a.id;

-- Push the assessment result onto the accommodation.
UPDATE accommodations acc
SET score = a.score,
    level = a.level,
    status = CASE WHEN a.level > 0 THEN 'certified' ELSE 'draft' END
FROM assessments a
WHERE a.accommodation_id = acc.id;

-- Explicit ids were inserted above; move the identity sequences past them
-- so the API's next INSERT doesn't collide.
SELECT setval(pg_get_serial_sequence('categories',     'id'), (SELECT MAX(id) FROM categories));
SELECT setval(pg_get_serial_sequence('criteria',       'id'), (SELECT MAX(id) FROM criteria));
SELECT setval(pg_get_serial_sequence('accommodations', 'id'), (SELECT MAX(id) FROM accommodations));
SELECT setval(pg_get_serial_sequence('assessments',    'id'), (SELECT MAX(id) FROM assessments));
