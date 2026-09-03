# Ecostay — Compleet pakket: prijstiers + auditor + admin

Deze zip (`ecostay-compleet.zip`) bevat **alle drie de uitbreidingen samen**,
omdat nog niets naar GitHub is gepusht:

1. **Twee prijstiers** — €2/mnd self-assessment, €8/mnd verified assessment
2. **Auditor-deel** — audits claimen, per criterium beoordelen met bewijsfoto's (Cloudinary)
3. **Admin-schermen** — overzicht, verblijfbeheer, auditbeoordeling, uitnodigingen

Pak deze zip uit over je repo (of begin schoon), en push het geheel. Dan staat
alles in één keer live en consistent.

---

## Stap 1 — Database migreren (Neon SQL Editor)

Draai deze bestanden in deze volgorde. Alle zijn idempotent (veilig om nogmaals
te draaien):

1. `db/migrate_canceled.sql`  ← waarschijnlijk al gedraaid; voor de zekerheid
2. `db/migrate_tiers.sql`     ← tier-kolommen (self/verified)
3. `db/migrate_audits.sql`    ← audits, audit_answers, audit_photos + verified-velden

Op een compleet verse database volstaat `db/schema.sql` (bevat alles behalve de
`invited_at`/`invited_by`/`canceled_at`-kolommen — draai dan óók `migrate_canceled.sql`).

## Stap 2 — Cloudinary (gratis, voor de bewijsfoto's)

Account op cloudinary.com → noteer **Cloud name**, **API Key**, **API Secret**.

## Stap 3 — Env vars op Render

| Naam                     | Waarde                                       |
|--------------------------|----------------------------------------------|
| `CLOUDINARY_CLOUD_NAME`  | uit Cloudinary                               |
| `CLOUDINARY_API_KEY`     | uit Cloudinary                               |
| `CLOUDINARY_API_SECRET`  | uit Cloudinary                               |
| `AUDITOR_KEY`            | zelfgekozen wachtwoord voor auditors         |
| `ADMIN_KEY`              | zelfgekozen wachtwoord voor beheer           |

Optioneel: `MOLLIE_PRICE_SELF=2.00`, `MOLLIE_PRICE_VERIFIED=8.00` (dit zijn al de
standaardwaarden in de code). De oude `MOLLIE_AMOUNT` mag weg.

## Stap 4 — Pushen

```
git add -A
git commit -m "Prijstiers, auditor-deel met fotobewijs, en admin-schermen"
git push origin main
```

Render en Vercel deployen automatisch.

---

## De schermen

- **/certificering** — aanmelden, abonnement kiezen (€2 of €8), betalen, zelfscan
- **/auditor** — auditor-sleutel → beschikbare audits → claimen → beoordelen met foto's
- **/admin** — admin-sleutel → onderstaande tabbladen

### Admin-tabbladen

- **Overzicht** — tellingen: verblijven per status, certificaten per niveau,
  abonnementen per tier, actieve maandomzet (MRR), audits per status.
- **Verblijven** — filter op status, zoek, **bewerk** alle gegevens, of **wijzig
  de status** (bv. een verblijf handmatig op certified/canceled zetten).
- **Audits** — alle audits; open een ingediende audit om de beoordelingen én
  bewijsfoto's per criterium te zien, en **keur goed of wijs af**.
- **Uitnodigingen** — maak een uitnodiging aan (verschijnt als 'invited') en zie
  wat er openstaat.

De links naar /auditor en /admin staan onderaan in de footer.

## Wat is getest

Volledige flow tegen een echte PostgreSQL 16:
- Prijstiers → juiste bedragen in Mollie-aanroepen
- Verified-verblijf rondt zelfscan af → audit ontstaat automatisch
- Auditor claimt, beoordeelt, uploadt (gesimuleerde) foto, dient in → verblijf verified
- Admin-gate (401 zonder sleutel), overzicht-tellingen, verblijf bewerken,
  statuswissel (canceled zet/wist canceled_at), audit goedkeuren, auditors-
  overzicht, uitnodiging aanmaken — allemaal groen.

## Bestandslocaties (bij handmatig kopiëren van de losse admin-bestanden)

| Bestand hier          | Plek in je repo                  |
|-----------------------|----------------------------------|
| `routes-admin.js`     | `server/src/routes/admin.js`     |
| `index.js`            | `server/src/index.js`            |
| `Admin.jsx`           | `web/src/pages/Admin.jsx`        |
| `api.js`              | `web/src/api.js`                 |

Let op: de admin-functie raakt ook `web/src/App.jsx` (route),
`web/src/components/Footer.jsx` (link) en de CSS onderaan `web/src/styles.css`.
Die kleinere wijzigingen zitten alleen in de complete zip — gebruik voor het
gemak gewoon `ecostay-compleet.zip`.

## Later uit te breiden

- Echte accounts in plaats van gedeelde sleutels (auditor + admin).
- E-mail versturen bij een uitnodiging (nu alleen de link gegenereerd).
- Private Cloudinary-assets voor gevoelig bewijsmateriaal.
