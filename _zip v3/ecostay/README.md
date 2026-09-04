# Ecostay

Duurzaamheidskeurmerk voor overnachtingen. Verblijven doorlopen een zelfscan; op
basis van hun score krijgen ze 1, 2 of 3 blaadjes (brons / zilver / goud) en
verschijnen ze in het openbare overzicht.

## Onderdelen

```
ecostay/
├── db/            MySQL-schema + seed (categorieën, criteria, demo-verblijven)
├── server/        Express-API (Node) die met PostgreSQL praat
├── web/           Vite + React frontend (Ecostay-huisstijl, leaf-rating)
├── docker-compose.yml
└── DEPLOY-GRATIS.md   Gratis hosten + later onderdeel-voor-onderdeel opschalen
```

De drie lagen praten alleen via env-vars met elkaar:

- de **frontend** kent de API via `VITE_API_URL`
- de **API** kent de database via `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` of één `DATABASE_URL` (+ `DB_SSL`)

Daardoor kun je elk onderdeel los vervangen zonder code te wijzigen.

## Snel lokaal draaien (Docker)

Vereist Docker. Eén commando zet database, API en frontend op:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- API:      http://localhost:4000/api/health
- Postgres: localhost:5432 (gebruiker `ecostay`, wachtwoord `ecostay`)

Het schema en de seed worden bij de eerste start automatisch geladen.

## Lokaal draaien zonder Docker

1. Start een PostgreSQL 16 en laad het schema:
   ```bash
   psql "postgres://ecostay:ecostay@localhost:5432/ecostay" -f db/schema.sql
   psql "postgres://ecostay:ecostay@localhost:5432/ecostay" -f db/seed.sql
   ```
2. API:
   ```bash
   cd server
   cp .env.example .env      # pas DB-gegevens aan
   npm install
   npm run dev               # http://localhost:4000
   ```
3. Frontend:
   ```bash
   cd web
   cp .env.example .env      # VITE_API_URL=http://localhost:4000
   npm install
   npm run dev               # http://localhost:5173
   ```

## Hoe de score werkt

Elk criterium heeft punten. Score = behaalde punten / totaal × 100.
Drempels: ≥ 40% brons (1), ≥ 60% zilver (2), ≥ 80% goud (3), daaronder nog niet
gecertificeerd. De logica staat op één plek: `server/src/scoring.js`.

## Online zetten

Zie **DEPLOY-GRATIS.md** voor een volledig gratis opzet (Vercel + Render, API én Postgres gratis samen)
en het pad om later per onderdeel op te schalen.
