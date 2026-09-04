# Gratis online zetten — en later per onderdeel opschalen

Nu je Postgres gebruikt, staat de gratis opzet op **twee** plekken in plaats van
drie: de API én de database draaien allebei gratis op **Render**, de frontend op
**Vercel**. Elk onderdeel vervang je later los, zonder de code aan te raken —
alleen env-waarden veranderen.

```
Bezoeker ─▶ Frontend (Vercel)  ──VITE_API_URL──▶  API + Postgres (Render)
               gratis                                  gratis
```

---

## Stap 1 — Repo op GitHub

Zet dit project in een GitHub-repo (Vercel en Render koppelen zich daaraan en
deployen automatisch bij elke push).

## Stap 2 — Database + API op Render

**2a. Postgres aanmaken**
1. Render → **New → Postgres** → gratis plan → aanmaken.
2. Kopieer de **Internal Database URL** (die gebruik je zo bij de API).
3. Laad schema + seed één keer. Pak de **External Database URL** en draai lokaal:
   ```bash
   psql "<external-database-url>" -f db/schema.sql
   psql "<external-database-url>" -f db/seed.sql
   ```
   (Of plak beide bestanden in Render's PSQL-shell.)

> Let op: Render's gratis Postgres vervalt 30 dagen na aanmaak (met een korte
> respijtperiode). Prima om te testen; voor iets blijvends upgrade je die later.

**2b. API-web service aanmaken**
1. Render → **New → Web Service** → kies je repo.
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
2. Environment variables:
   ```
   DATABASE_URL = <Internal Database URL van stap 2a>
   CORS_ORIGIN  = https://<jouw-vercel-domein>.vercel.app
   ```
   (De interne URL heeft geen SSL nodig. Gebruik je de externe URL, zet dan ook
   `DB_SSL=true`.)
3. Deploy. Test `.../api/health` → `{"ok":true}`.

> Een gratis Render-service valt na ~15 min zonder verkeer in slaap; de eerste
> request daarna duurt ~1 minuut. De frontend toont ondertussen "Verblijven laden…".

## Stap 3 — Frontend op Vercel

1. Vercel → **Add New → Project** → dezelfde repo.
   - **Root Directory:** `web` (Vite wordt herkend).
2. Env-var:
   ```
   VITE_API_URL = https://<jouw-render-api>.onrender.com
   ```
3. Deploy. Klaar — de site staat live en praat met de API + database.

---

## Later opschalen — onderdeel voor onderdeel

Alles hangt via env-vars aan elkaar, dus je vervangt elk stuk los.

**Database te krap of verlopen? → alleen de database.**
Neem een blijvende Postgres (Render betaald vanaf ~$6/mnd, of Supabase/Neon,
of Postgres op een VPS), laad `schema.sql`, migreer je data, en wijzig alleen
`DATABASE_URL` op de API. Geen codewijziging.

**API-cold-start stoort? → alleen de API.**
Upgrade Render naar het betaalde plan ($7/mnd, geen slaap), of verhuis naar een
VPS. Verandert de URL, dan pas je alleen `VITE_API_URL` in Vercel aan.

**Alles op één goedkope plek? → één VPS.**
Neem een kleine VPS (bijv. Hetzner CX22, ~€4–5/mnd) en draai het hele project
met `docker compose up` (die gebruikt nu Postgres). Zet `VITE_API_URL` naar je
eigen domein. Eén rekening, volledige controle.

**De frontend** kan op Vercel blijven — die gratis tier is ook op termijn prima.

### Samengevat

| Onderdeel | Gratis start        | Eerste upgrade            | Volledige controle |
|-----------|---------------------|---------------------------|--------------------|
| Frontend  | Vercel              | (blijft)                  | eigen host / VPS   |
| API       | Render free         | Render $7 / VPS           | VPS (docker)       |
| Database  | Render Postgres free| Render betaald / Neon / Supabase | Postgres op VPS |

Elke stap raakt maar één laag en hooguit een paar env-waarden.
