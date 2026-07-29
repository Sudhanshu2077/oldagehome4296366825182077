# IGOHMS — Functional Requirements (FRD)

## FR-1 Authentication & Onboarding
- FR-1.1 User signs in with Firebase email/password or Google (web).
- FR-1.2 `POST /auth/login` exchanges a Firebase ID token for platform access+refresh JWT pair; session row persisted with device fingerprint + IP.
- FR-1.3 `POST /auth/refresh` rotates access token; validates device match and revocation state.
- FR-1.4 `POST /auth/logout` revokes the session.
- FR-1.5 `POST /auth/onboard` registers a new institution + its Institution Head atomically.
- FR-1.6 `POST /auth/join` registers an external user (family/donor/citizen).
- FR-1.7 Brute-force lockout after N failed logins (config: `BRUTE_FORCE_MAX_ATTEMPTS`, `BRUTE_FORCE_LOCK_MS`).

## FR-2 RBAC
- FR-2.1 Roles: gov-super-admin, state-commissioner, regional-officer, district-officer, taluka-officer, institution-head, assistant-manager, department-user, family, donor, citizen.
- FR-2.2 Permissions as data: `Role`, `Permission`, `RolePermission`, `ModulePermission` collections; seeded by `scripts/seed.ts`.
- FR-2.3 Department users write only registers granted to them; assistant-manager writes all 13; institution-head reads all, writes none; government tier reads only within jurisdiction.

## FR-3 Registers (R1–R13)
- FR-3.1 List registers: `GET /registers`.
- FR-3.2 List entries: `GET /registers/:register/entries?page&pageSize`.
- FR-3.3 Create: `POST /registers/:register/entries { fields }` — server assigns `REG<YEAR>-<seq>` atomically per (tenant, register).
- FR-3.4 Update: `PUT /registers/entries/:id { fields }`.
- FR-3.5 Soft-delete: `DELETE /registers/entries/:id`.
- FR-3.6 Every mutation writes an audit log and broadcasts `register:changed` to the tenant's Socket.io room.

## FR-4 Inquiries / Announcements / Events
- FR-4.1 Inquiries: submit (authenticated), list, advance status (open → in-progress → resolved → closed).
- FR-4.2 Announcements: head/manager publish + delete; audience filtering for external users.
- FR-4.3 Events: head/manager create + delete; public events visible to external tier.

## FR-5 Documents
- FR-5.1 Upload (multipart, ≤20MB), list, download (streamed), delete. Version array retained on the document.

## FR-6 Master Data
- FR-6.1 Catalogs: state, region, district, taluka, village, department, blood-group, disease, medicine-category, room-type, bed-type, donation-type, complaint-type, notification-type.
- FR-6.2 Government tier writes; everyone reads active items.

## FR-7 Settings / Notifications / Dashboard / Logs
- FR-7.1 Settings: key-value per scope (institution|government), group+key unique.
- FR-7.2 Notifications: in-app channel persisted; external channels queued via provider-ready engine.
- FR-7.3 Dashboard: KPIs (monthly entries, active users, open inquiries), register cards, recent activity, pending tasks.
- FR-7.4 Audit log: immutable, append-only, readable by institution head/manager and governing government role.
- FR-7.5 Activity log: lightweight session/action events.

## FR-8 Multi-tenancy
- FR-8.1 Every document carries `tenantId`; every repository query passes through `tenantFilter()` or `jurisdictionFilter()`.
- FR-8.2 Government writes to tenant-scoped entities are rejected at middleware.
