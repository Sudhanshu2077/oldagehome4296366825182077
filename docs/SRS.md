# IGOHMS — Software Requirement Specification (SRS)

## 1. System Architecture
Modular monolith (microservice-extractable) — Clean Architecture + DDD layering per bounded context:

```
backend/src
├── config/        env, logger, Fastify assembly
├── kernel/        errors, types (rbac, permission, session), pagination, response shape
├── plugins/       error-handler, security, auth, tenant-scope, audit-hook, realtime, health
├── services/      mongo, firebase, lockout, storage (driver interface + local-fs)
└── modules/       auth, rbac, user, tenant, master-data, settings, documents,
                   notifications, audit-log, activity-log, dashboard, registers,
                   inquiries, announcements, events
```

Each module: `entity` (Mongoose) → `repository` (data access) → `service` (business rules) → `controller`/`routes` (HTTP). Cross-cutting behavior (authn, tenant scoping, audit) lives in Fastify plugins registered once.

## 2. Interfaces
- REST/JSON over HTTPS; standard envelope `{ success: true, data }` and error shape `{ error, message, requestId }`.
- Socket.io namespace `/registers` with JWT-verified handshake, tenant rooms `tenant:<id>`.
- Storage driver interface (`putObject/getObject/headObject/deleteObject/presign*`) with local-fs implementation; S3 driver pluggable.

## 3. Data Model (MongoDB Atlas)
| Collection | Key fields | Notes |
|---|---|---|
| users | firebaseUid (uniq), roleId, tenantId, departmentCode, grantedPermissions[], registerWriteScopes[], jurisdiction | isActive, lock fields |
| institutions | code (uniq), name, nameMr, jurisdiction refs | tenant anchor |
| roles / permissions / rolepermissions / modulepermissions / departments | RBAC as data | seeded by scripts/seed.ts |
| register_entries | tenantId+register+entryNumber (uniq), fields (mixed), soft delete | seq via counters collection |
| counters | tenantId+register+year (uniq), seq | atomic $inc |
| inquiries, announcements, events | tenantId scoped | status/audience/public flags |
| documents | tenantId, storageKey, versions[] | local-fs or S3 driver |
| settings | tenantId+scope+group+key (uniq) | |
| notifications / notification_templates | userId, channel, delivery state | |
| audit_logs | append-only: before/after snapshots | no update/delete |
| activity_logs | session/action events | |
| sessions | refreshTokenHash, device, expiry, revokedAt | |
| master_data | catalog+code (uniq), parentCode | |

## 4. Non-Functional Requirements
- Security: helmet headers, CORS, global + per-route rate limits, brute-force lockout, JWT (HS256) with refresh rotation, Firebase ID-token verification, strict tenant middleware, no `tenantId` accepted from request bodies for scoping.
- Reliability: Mongo retry writes + majority concern; graceful shutdown.
- Performance: pagination (max 200/page), indexed tenant+register queries, dashboard counts via countDocuments.
- Auditability: every create/update/delete calls `auditHook` → append-only `audit_logs`.
- Portability: Dockerized backend; Expo single codebase for web/Android/iOS.

## 5. Environment
See `backend/.env.example` and `frontend/.env.example`. Secrets never committed.
