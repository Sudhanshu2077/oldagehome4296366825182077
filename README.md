# Old Age Home Management App

Multi-tenant register-keeping system for old age homes. Each old age home is an isolated tenant. The app replaces paper record-keeping with **13 digital registers** plus supporting tabs (Inquiry, Profile, Settings, Reports, Announcements, Events).

## Tech stack
- **Backend:** Node.js + Fastify + TypeScript + Mongoose (MongoDB Atlas)
- **Frontend:** React Native via Expo (one codebase for web + native iOS/Android)
- **Auth:** Firebase (Google Sign-In + Email/password with email OTP + reCAPTCHA v2)
- **Real-time:** Socket.io on the same Fastify server
- **Storage:** Firebase Storage (for scanned docs & photos)

## Repo layout
```
/
├── backend/        # Node + Fastify API (fully independent package)
├── frontend/       # Expo React Native app (fully independent package)
├── AGENTS.md       # Project conventions — READ BEFORE EDITING
├── package.json    # Root convenience scripts only (delegates to each folder)
├── .gitignore
└── .editorconfig
```
The `backend/` and `frontend/` folders are kept **fully separate** — each has its own `package.json`, `tsconfig.json`, and dependencies. The root `package.json` only provides convenience scripts.

## Getting started (local dev)
```bash
# from repo root
npm run install:all      # installs both backend and frontend deps
npm run dev:backend      # starts Fastify on http://localhost:4000
npm run dev:frontend     # starts Expo (web target) on http://localhost:8081
```

Each folder has its own `.env.example` — copy to `.env` and fill in real values.

## Status — per-step tracking
This project is built step-by-step. See `AGENTS.md` for the current step status and constraints. Never build a step that hasn't been approved.

## No demo data
Per client spec: **zero** seed/sample/demo data. All schemas and flows must be production-ready, not demo-shaped.
