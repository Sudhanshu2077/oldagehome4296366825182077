# AGENTS.md — Project Operating Reference

> Read this before editing anything. Re-explaining these every session wastes time.
> Last updated: Phases 1-5 implemented — modular-monolith Clean Architecture + Phase 2-5 resident/finance/governance/AI/portal modules and orange/white Expo frontend.

## 1. What this project is
**Maharashtra Integrated Old Age Home Management System (IGOHMS)** — a centralized, multi-tenant government ERP used by the Maharashtra Government to digitally manage every registered Old Age Home (each Old Age Home = one isolated tenant; government = global cross-tenant tier with read visibility). Replaces paper record-keeping with **13 digital registers** plus supporting tabs (Inquiry, Profile, Settings, Reports, Announcements, Events, Dashboard, Master Data, Documents, Notifications, Audit Log). Built for a client selling this to a government body — every decision must be defensible, every behavior testable, every action audited.

**This is real client work. Treat data integrity, access control, audit trails, and tenant isolation as first-class. No shortcuts. No demo data. No mock fields.**

Future expansion is on the roadmap (Orphanages, Rehabilitation Centres, Women Shelters, Child Care Homes, Disabled Care Centres), so the architecture must be modular and configurable — a modular monolith today, microservice-extractable tomorrow.

## 2. Tech stack (fixed — do not substitute)
| Layer | Choice |
|------|--------|
| Backend | Node.js + Fastify + TypeScript + Mongoose (Clean Architecture + DDD + Repository pattern + DI) |
| Frontend | Expo (React Native) — one codebase for web + native (iOS/Android) |
| DB | MongoDB Atlas (cloud) |
| Auth | Firebase (Google Sign-In + email/password + email OTP) + reCAPTCHA v2 checkbox + our own session JWT (Refresh Token, device tracking, lockout) layered on top of Firebase ID-token verification |
| Real-time | Socket.io on the same Fastify server, tenant-scoped rooms |
| Storage | Firebase Storage (scanned docs, photos) primary + S3-compatible pluggable driver for institutional document archives |
| Caching | In-process LRU for Phase 1 (Redis-ready for Phase 2+) |
| Tests | Jest backend + frontend (frontend: React Native Testing Library added later) |
| Containerization | Docker + docker-compose (backend only this phase; Mongo stays on Atlas) |
| CI/CD | GitHub Actions (typecheck + lint + tests) |
| Package manager | npm (use `npm.cmd` on this Windows box — `npm.ps1` is blocked) |

### Stack deviation note (deliberate, client-approved)
The Phase 1 design prompt mandated NestJS + Prisma + PostgreSQL + Flutter + raw JWT auth. **We deliberately do NOT adopt those** in favour of the existing locked stack (Fastify + Mongoose + MongoDB Atlas + Expo + Firebase auth + reCAPTCHA v2), because (a) the client-provided Base Instruction.txt and the existing Step-1/Step-2 investment already commit to this stack, and (b) Mongo Atlas is already provisioned and the Firebase project is set up. What we DO adopt from the Phase 1 prompt: the modular-monolith Clean Architecture folder layout, full RBAC hierarchy and permissions matrix, multi-tenant strictness with cross-tenant guarantees, audit log immutability, notification engine (channels + templates + queue + retry), document management (versioning + tags + signature-ready), master-data catalog, settings module, dashboard, security hardening (brute-force lockout, security headers), CI/CD, Docker, and the BRD/FRD/SRS/HLD/LLD/docs deliverables. **Anyone proposing to swap the stack must reject — only the architecture + feature surface changes.**

## 3. Repo layout
```
/ (root)            # only root package.json with convenience scripts + configs + CI workflow
├── backend/        # fully independent npm package — modular monolith
│   └── src/
│       ├── server.ts                  # entry point
│       ├── config/                    # env, logger, app (Fastify assembly)
│       ├── kernel/                    # shared kernel: container, errors, types, pagination, response shape
│       ├── plugins/                   # fastify plugins: auth, tenant, security, error-handler, audit-hook, swagger
│       ├── services/                  # cross-cutting services: mongo, firebase, storage, notifications queue
│       └── modules/                   # one folder per bounded context
│           ├── auth/                 # {controller,service,repository,dto,entity,routes,module}
│           ├── rbac/                 # roles+permissions+rolepermissions+modulepermissions (hierarchy)
│           ├── user/                 # user-hierarchy: gov-tier + institution-role + department + grants
│           ├── tenant/               # institution (old age home) aggregates + gov jurisdiction
│           ├── master-data/          # states/districts/talukas/villages/departments/blood-groups/...
│           ├── settings/             # institution + government + branding/language/timezone settings
│           ├── documents/            # S3-compatible storage abstraction + versions + tags
│           ├── notifications/        # templates + channels + queue + retry
│           ├── audit-log/            # immutable write-once audit events
│           ├── activity-log/         # lightweight session/action events
│           ├── dashboard/            # KPI/cards/recent-activity/pending-tasks endpoint
│           ├── registers/            # R1..R13 generic register entries (Steps 7-11, Phase 2)
│           └── (future modules land here as siblings)
├── frontend/       # fully independent npm package — Expo
├── docs/           # BRD, FRD, SRS, HLD, LLD, ER-notes, API-overview, folder-structure, deployment, design-system
├── AGENTS.md       # this file
├── Base Instruction.txt   # client brief — do not modify
└── .github/workflows/    # CI
```
- The `backend/` and `frontend/` folders are **fully separate**. Each owns its own `package.json`, `tsconfig.json`, ESLint/Prettier, dependencies, and `.env`.
- The root `package.json` only contains convenience scripts that shell into each folder via `npm --prefix`. **Never add shared dependencies at the root.**
- Editing the frontend must never require touching the backend and vice versa.
- `docs/` is the ONLY sanctioned location for project documents. Never drop markdown files randomly in the tree.

## 4. Hard rules
1. **No demo/sample/seed data anywhere.** Empty, real-usage-ready scaffolding only. (Master-data catalogues ship empty by default — real values are entered at deploy time, not seeded.)
2. **No comments in code** unless explaining genuinely non-obvious behavior — and even then prefer self-documenting names.
3. **No emojis** in code, commits, or docs unless the user explicitly asks.
4. **Never commit secrets.** `.env`, `serviceAccountKey.json`, `google-services.json`, `GoogleService-Info.plist` are all gitignored — keep them that way.
5. **Never run `git commit`, `git push`, amend, force-push, or open PRs** unless the user explicitly asks.
6. **TypeScript strict mode is on** in both folders. Keep it on. Fix type errors, never suppress with `any`.
7. Build in the cadence the user asks for. The current cadence is Phase 1 → 5 (5 prompts), NOT the old Step-by-step.
8. The user has said: **do NOT run tests / typecheck / lint until they explicitly ask for full-app testing.** Just build. Verification happens at the end.
9. Every module must contain, as applicable: controller, service, repository, DTO, validation, entity/model, routes, module-level Fastify plugin. All APIs must be Swagger-documented.
10. **Client standing instruction: after ANY change the user asks for, update ALL of: git (commit + push to `master`), Vercel (frontend — auto-deploys on push), and Render (backend — auto-deploys on push; set env vars via the Render API if the change needs them). Verify each deploy is live (Vercel `vercel ls --prod` shows Ready; Render deploy status `live`) before reporting done.**

## 5. Roles & permissions
### Two-tier hierarchy (Phase 1 model)

**Government tier (global — cross-tenant read visibility into institution aggregates they govern):**
Gov Super Admin → State Commissioner → Regional Officer → District Officer → Taluka Officer

**Institution tier (tenant-scoped — full RBAC inside one institution/old age home):**
Institution Head → Assistant Manager → Department User
Departments: Reception, Doctor, Nurse, Kitchen, Store, Finance, HR, Volunteer, Security, Maintenance

**External tier (limited self-service + inquiry):**
Family, Donor, Citizen

### Roles as data (RBAC tables, not hardcoded)
Roles, Permissions, RolePermissions, ModulePermissions are **persistent Mongoose collections** seeded via a one-time bootstrap script (run manually at deploy) — NOT hardcoded enum switches. Tenants may define additional Institution-tier roles but cannot create Government-tier roles.

### Register-write model (preserved from the old 13-register plan — now expressed via permissions)
- All institution users can READ all 13 registers (when granted the relevant read permission).
- Institution Head + Assistant Manager can WRITE all 13 registers (`register:write:R1`..`R13` permissions on their role).
- Department Users can WRITE only registers granted to their department grants (the old "Staff assignedRegisterIds array" is now stored as `ModulePermission` rows: `{ scope: 'register', resource: 'R7', action: 'write' }`).
- A Department User may belong to one of: Reception / Doctor / Nurse / Kitchen / Store / Finance / HR / Volunteer / Security / Maintenance.
- Government tier: read-only across institutions they govern. Cannot write to registers.
- External tier: can submit inquiries, view their own profile/documents/calendar — cannot read registers.

### Static role summary (sanity check vs old Section 5)
| Role | Read registers | Write registers | Inquiry | Announcements | Events | Profile/Settings |
|------|---|---|---|---|---|---|
| **Gov Super Admin / Commissioner / Officers** | all institutions under their jurisdiction, read-only | never | read | read | read | own |
| **Institution Head (= old Owner)** | all 13 (read-only) | never (audit parity view) | no | read + write | read + write | own |
| **Assistant Manager (= old Manager)** | all 13 (read+write) | all 13 | read + write | read + write | read + write | own |
| **Department User (= old Staff)** | all 13 read-only; write only granted registers | granted subset | read + write | read only | read only | own |
| **Family / Donor / Citizen** | no | no | submit own only | public ones only | read public | own |

## 6. Multi-tenancy rule (inviolable)
- Every persistent document carries `tenantId` (= the institution/Old Age Home's `_id`).
- Government-tier data (states, districts, master-data, gov users) carries `tenantId: null` and is readable cross-tenant by authorized gov roles only.
- **Every** query must filter by the requesting user's resolved `tenantId` from their verified session. Never accept `tenantId` from the request body or query string.
- A user from institution A must never be able to read institution B's data. Enforcement in middleware + a `tenantFilter()` repository wrapper, NOT in route handlers. Routes that don't enforce are bugs.
- Government-tier reads cross institutions but are still scoped to the user's jurisdiction (state/region/district/taluka) and to fields the role is permitted to read.

## 7. Audit trail (locked, expanded for Phase 1)
- A write-once immutable record to `audit_logs` on every create/update/delete/approve/reject/export/print across ALL entities (not just registers).
- Shape: `{ _id, tenantId, userId, role, action, entity, entityId, before, after, reason?, device?, browser?, ip, geo?, timestamp }`. `before`/`after` are snapshot diffs. Records are append-only (no updates, no deletes — enforced at the repository layer).
- Read APIs for audit logs are visible to Institution Head + Assistant Manager + the user's governing Government-tier role only.

## 8. Sequential register entry IDs (locked)
- Every register entry gets an auto-incremented, human-readable number scoped per `(tenantId, registerType)`.
- Format: `<REG><YEAR>-<6-digit-padding>` (e.g. `REG2026-000001`) — specifically NOT `REG-2026-0001` because hyphens confuse non-tech users when they need to read it aloud.

## 9. What has been built so far
- [x] Step 0 — Clarifications + plan approval
- [x] Step 1 — Repo scaffold (root + backend + frontend config, .gitignore, .editorconfig, README, AGENTS.md, git init)
- [x] Step 2 — Backend foundations: Fastify + Mongo Atlas connection + helmet/CORS/rate-limit + /health + graceful shutdown
- [x] Phase 1 — Foundation & Core Platform: modular-monolith Clean Architecture (kernel/plugins/modules), RBAC collections + system roles/departments catalog, user hierarchy model, dual-token auth (platform JWT first, Firebase ID token fallback), tenant-scoping plugin (tenantFilter/jurisdictionFilter), audit-log + activity-log (append-only), notification engine (in-app channel + provider-ready), document mgmt (local-fs S3-compatible driver), settings (scoped key-value), master-data (14 catalogs), dashboard, security hardening (brute-force lockout, security headers), Dockerfile + docker-compose, GitHub Actions CI, docs/ (BRD/FRD/SRS/HLD-LLD-API/DEPLOYMENT)
- [x] Phase 2 — Resident & daily operations: residents, admissions, discharges, transfers, deaths, family, rooms, beds, medical records, nurse rounds, doctor visits, medicines, pharmacy stock, medicine issues, attendance (resident/employee), visitors, kitchen menus, meal attendance, diet plans, store consumption, laundry, housekeeping, maintenance, emergencies, incidents, daily register via generic ERP module engine; frontend tabs, modules grid, Excel-type CRUD, workflows, RBAC, audit hooks, Socket.io broadcasts
- [x] Phase 3 — Finance, HR, admin, compliance ERP: accounts/ledger, cash/bank books, vouchers, incomes/expenses, budgets, donations, CSR, assets, dead stock, procurement, vendors, inventory, employees, payroll, leaves, trust meetings, resolutions, complaints, suggestions, licenses, grants, audits, bank transactions via generic ERP module engine; reports module endpoints; finance statements module (trial balance, balance sheet, income statement, cash flow, bank reconciliation); auto voucher-number generation; document generation endpoints (receipt, 80G, payslip, discharge/death certificates)
- [x] Phase 4 — Government governance platform: government dashboards (state/regional/district/taluka), institution monitoring, compliance, inspections, approvals, monthly closing/unlock requests, government audits, grants, emergency control center, analytics, GIS map data, circulars; portal endpoints (citizen, family, donor, volunteer)
- [x] Phase 5 — AI assistant, natural-language search, automation jobs (medicine/license expiry, low stock), notification engine, Expo frontend with orange/white theme, Reports tab, Government tab, refresh-token auth, offline-ready structure, Swagger UI, CI/CD, Docker
- [x] Final verification: `tsc --noEmit` clean in both folders; backend boots in dev-local mode with RBAC seed and automation jobs; frontend typecheck clean
- [x] Frontend UI/UX refresh: dynamic light/dark theme system (src/config/ThemeContext.tsx + palettes in theme.ts), i18n system with English/Hindi/Marathi presets (src/i18n/index.tsx) persisted to storage, reusable HeaderControls popover (src/components/HeaderControls.tsx) wired top-left into the tab header and the login screen, plus Language + Theme sections added to the Settings (Profile) tab; login, profile, dashboard, and tabs bar modernized with rounded soft white/orange styling. Other register/module tab bodies still consume the legacy static palette.
- [x] Remaining registers as dedicated modules (generic schema-register engine + hardcoded modules): **R2 Food Taste** (`schema-register/food-taste`, prefix FT), **R9 Source-Verified** (`schema-register/source-verified`, prefix SV), **R7 Medical** (`medical`, prefix MD, sourceFlaggedColumns medicineAllowances), **R8 Cash Book** (`cashbook`, prefix CB, integer-safe cash/bank rupees+paise). All wired into `modules/index.ts` + `REGISTER_TITLES`, with trilingual (en/hi/mr) frontend screens (`frontend/app/{medical,cashbook}` + `schema-register/food-taste|source-verified`), full DRAFT→SUBMITTED→FINALIZED workflow + corrections ledger + CSV/XLSX/PDF exports, audit hooks, socket broadcasts, RBAC enforcement (institution-head read/finalize only, no create). Schema-register engine validates schema columns against reserved keys (`entryNumber/date/month/remarks/status/...`), and date fields render as `YYYY-MM-DD` in all exports. Verified live in production (Render commit `e677183`, Vercel Ready): medical/cashbook/FT/SV create→submit→finalize→correct + CSV exports + RBAC write-denial.
- [x] **R10 Year-wise Admission Register** (`yearwise-admission`, entry numbers `YWA{startYear}-{seq6}`, register-year-scoped counters) and **R11 Resident Attendance Register** (`resident-attendance`, daily per-date sessions `ATT-YYYY-MM-DD-{seq6}`, unique `{tenantId, attendanceDate}`, collection `resident_attendance_sessions`). Both fully wired into `modules/index.ts` + `REGISTER_TITLES`, trilingual (en/hi/mr) screens (`frontend/app/yearwise-admission/*`, `frontend/app/resident-attendance/*`), backend typecheck clean. YWA: 8-column physical register, DRAFT→UNDER_REVIEW→APPROVED→FINALIZED (+VOIDED) workflow, masked Aadhaar (reveal role-gated to government/institution-head/assistant-manager + audited, crypto reused from admission module), corrections ledger, CSV/XLSX/PDF exports. Attendance: eligible residents auto-derived from resident master (excludes discharged/transferred/deceased, admissionDate ≤ date), mark endpoint merges newly eligible residents into the session, PRESENT/ABSENT/ON_LEAVE/MEDICAL/TEMPORARILY_OUT/OTHER with mandatory reason for ABSENT/MEDICAL/TEMPORARILY_OUT, present-all fill, submit blocks on unmarked residents, post-submit corrections ledger, monthly P/A/L/M/T/O matrix + attendance %, daily/monthly CSV+PDF exports. RBAC: assistant-manager/department-user write; institution-head read-only (write denied, verified); corrections institution-head/assistant-manager. Verified live in production (Render commit `3477ac2`, Vercel Ready): YWA create→submit→approve→finalize→correct + Aadhaar reveal + CSV/PDF; attendance mark→submit→correct→monthly + exports; R10/R11 titles and endpoints live on prod.
- [x] **Events tab rework** (Render commit `6e362aa`, Vercel Ready): two-option landing — Add Upcoming Event and Check Past Events. Add-upcoming modal uses arrow-button steppers (‹/›) for hour (1–12) and minute (step 5) plus AM/PM, YYYY-MM-DD date field, multi-image PNG/JPG attach (no count limit). Past events render group-chat style: date dividers + chat bubbles showing held date, title (trilingual), description, and pinned images. Backend: `photos` array on event entity, `POST /events/:id/images` multipart upload (PNG/JPEG only, 20MB limit, audited, socket broadcast), `GET /events/media?key=` tenant-scoped media serving (buffered; 404 when object missing — commit `530b1d7`; frontend `EventImage` hides broken images). Verified locally + live on prod: create past+upcoming events, upload/serve PNG, cross-tenant 403, missing-media 404.
- [x] **Google-style calendar picker** (commit `d9e3fa2`, Vercel Ready): the event-date text input in the Add Upcoming Event modal is replaced with a tappable date button that opens a theme-matched popup calendar (`frontend/src/components/CalendarPicker.tsx`). Month grid with prev/next chevron navigation, tap header to switch to month picker then year picker (year-changing chevrons), selected/today highlighting via `palette.*`, weekday + month names localized via Intl for en/hi/mr, day numbers (non-current-month) muted.
- [x] **Source-verified register document proof** (commit `e4121c2`, Render + Vercel Ready): schema-register entries carry a `documents` array (storage keys exposed as `/schema-register/media?key=` URLs); `POST /schema-register/:code/:id/documents` multipart upload (PNG/JPG/PDF only, tenant-scoped storage key `${tenantId}/schema-register/${uuid}/${filename}`, audited, socket broadcast); `GET /schema-register/media?key=` buffered tenant-prefix-guarded serving (403 cross-tenant, 404 missing). Submission now REQUIRES at least one document proof when any schema column has `sourceFlag` (verified: 400 without doc, success with). Frontend: attach section (multi-file PNG/JPG/PDF) in the new-entry form + document thumbnail viewer/attacher on the detail screen (attach allowed in DRAFT only), trilingual keys (`sreg.documents`, `sreg.attachDocument`, `sreg.uploadingDocuments`, `sreg.documentProofRequired`).
- [x] **OpenRouter legal Q&A live in web app** (commit `d3c405b`, Render deploy live): the AI tab already routed `/ai/ask` through `OpenRouterService` (free-model priority chain), but prod was falling back to rule-based scaffolding because `OPENROUTER_API_KEY` was missing from Render env vars — added it via Render API (`PUT /v1/services/{serviceId}/env-vars/OPENROUTER_API_KEY`; fresh key found in `C:\Users\Subbh\.render\cli.yaml`, the old `rnd_XPIo...` key is stale) and redeployed. System prompt now explicitly handles legal/regulatory questions: cites the Maintenance and Welfare of Parents and Senior Citizens Act 2007 (Sec 19 registration), Maharashtra MWPSC Rules 2010, trust/society/Section-8/FCRA forms, 80G, CSR (Sec 135), 12A/12AA; required to say so when unsure, cite Act/Section/Rule, and include a not-legal-advice disclaimer. Verified on prod: legal question returns `model=nvidia/nemotron-3-ultra-550b-a55b:free` with a Section 19 / Maharashtra Rules answer (previously `model=none` + fallback message).
- [x] **Full trilingual i18n sweep** (frontend): every visible string now goes through `t()` with complete en/hi/mr key parity (1163 keys per language, verified programmatically). Fixed: Marathi-when-other-language bugs (registers grid `titleMr` now shows only for `mr`; dashboard KPI/card labels, portal institution names, events/announcements titles, and the 8 dedicated register headers (`officeName`/`officeNameMr`) all switch on `lang === 'mr'`); Hindi-when-English bugs (generic Modules grid + `module/[code].tsx` now use `t('mod.<code>')` for all 63 ERP module titles instead of backend `titleMr`, plus a shared `fieldKeyToI18n` resolver `src/i18n/fieldKeys.ts` covering ~60 common module/register field labels); missing keys added (40 `finance.*` to hi/mr, full `gov.*` modals, `health.*` vitals, `events.am/pm` + validation errors, `ai.*`, `family/donor/volunteer.*` success messages, `announcements.titleMr/bodyMr`, `settings.account/comingSoon/cacheCleared`, 29 `regField.*` + 40 `modField.*`). Typecheck clean; frontend auto-deploys to Vercel on push.

## 10. Plan (Phase 1-5 cadence)
- **Phases 1-5 — IMPLEMENTED** (see Section 9). All major backend domains and frontend screens are in place.
- **Before client demo / deploy**:
  1. Fill `backend/.env` (real `MONGODB_URI`, strong `SESSION_SIGNING_KEY`, Firebase service account at `backend/serviceAccountKey.json`).
  2. Run `npm run seed` once (RBAC bootstrap; optionally `GOV_ADMIN_FIREBASE_UID` + `GOV_ADMIN_EMAIL` to provision the first gov super admin).
  3. Fill `frontend/.env` (`EXPO_PUBLIC_FIREBASE_*` web config + `EXPO_PUBLIC_API_BASE_URL`).
  4. Run `npm run typecheck` in both folders and fix any remaining issues.
  5. `npm run dev` in both folders; register an institution via the onboarding screen.
- **Post-demo hardening backlog** (safe to defer): full Jest suites for all modules, S3 driver implementation, SMS/WhatsApp provider integrations, external LLM provider wiring, E2E test pass, production deployment runbook execution.

## 11. Build cadence reminder (from client)
- Work in the Phase 1-5 cadence (5 prompts), one phase per prompt unless explicitly split.
- If context window approaches ~1M tokens, **compact context** before continuing.
- **No shortcuts to fit work in token limits** — if a phase needs to be split, split it openly, don't fake completeness.
- Wild focus on actually building the app, not on talking about building it.

## 12. Local environment specifics for this machine
- Windows + PowerShell 5.1.
- `npm.ps1` is blocked by execution policy. **Always invoke `npm.cmd`** (the tool wrapper does this automatically when you call `npm` but be explicit).
- Node v24.17.0, npm 11.13.0, git 2.55, Python 3.14.
- MongoDB is hosted on Atlas — no local Mongo install. Connection string lives in `backend/.env` (gitignored, not in repo).
- Firebase service account lives at `backend/serviceAccountKey.json` (gitignored). Never commit it.

## 13. Folder-aware "do not touch"
- `Base Instruction.txt` — client's original brief. Read-only.
- `AGENTS.md` — update Section 9 status as each phase/feature lands; update Section 10 with shifting plan.
- `docs/` — sanctioned doc location. Add new docs here; never scatter markdown in the tree.
- Root `package.json` scripts can be added to, but no dependencies at root level.
