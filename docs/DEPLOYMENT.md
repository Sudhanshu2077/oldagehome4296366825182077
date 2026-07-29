# IGOHMS — Deployment & Operations

## Prerequisites
- Node 20+, npm, Docker (optional), MongoDB Atlas cluster, Firebase project (Auth enabled: Email/Password + Google), service account JSON.

## Backend setup
```bash
cd backend
cp .env.example .env          # fill MONGODB_URI, SESSION_SIGNING_KEY (64+ chars), paths
# place Firebase service account at backend/serviceAccountKey.json
npm ci
npm run seed                  # one-time RBAC bootstrap (roles, departments, permissions)
npm run dev                   # tsx watch, http://localhost:4000
```

Provision the first government admin:
```bash
GOV_ADMIN_FIREBASE_UID=<uid> GOV_ADMIN_EMAIL=<email> npm run seed
```

## Frontend setup
```bash
cd frontend
cp .env.example .env          # fill EXPO_PUBLIC_FIREBASE_* and EXPO_PUBLIC_API_BASE_URL
npm ci
npm run dev                   # expo start --web (also: --android / --ios)
```

## Docker
```bash
docker compose up --build     # backend on :4000, storage volume ./backend/.storage equivalent
```

## CI
`.github/workflows/ci.yml` runs typecheck + lint + tests on backend for pushes/PRs.

## Operational notes
- Swagger UI is served at `http://localhost:4000/docs` (OpenAPI JSON at `/docs/json`).
- Register entry numbers are sequential per (tenant, register, year) — atomic counters collection.
- Audit logs are append-only; do not add update/delete endpoints for them.
- Storage defaults to local-fs driver (`.storage/`); implement an S3 driver against `services/storage.service.ts` interface for production archives.
- Rate limits and lockout are env-configurable.
