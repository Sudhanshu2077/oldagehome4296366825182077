# IGOHMS — HLD / LLD / API Overview

## High-Level Design
```
Expo app (web/android/ios)            Government dashboard (same app, gov role)
        |  REST + Socket.io (JWT)                   |
        v                                           v
   Fastify modular monolith  <---->  MongoDB Atlas (multi-tenant collections)
        |---- Firebase Admin (ID token verify)
        |---- Local/S3 storage driver (documents)
```

## Low-Level Design (request lifecycle)
1. `onRequest`: request-id assigned; `req.user=null`.
2. Security plugin sets headers; rate limiter gates by IP.
3. Route preHandler: `authenticate` → tries platform JWT first, falls back to Firebase ID token → loads user (role, tenant, permissions) into `req.user`.
4. `requireTenantScope` (writes) / `requireTenantRead` (reads) / `requireCrossTenantRead` (gov) enforce Section-6 rules.
5. Controller → service → repository (all queries via `tenantFilter()` / `jurisdictionFilter()`).
6. Mutations call `auditHook` (append-only audit_logs) and `recordActivity`; register writes also emit Socket.io events.
7. Errors funnel through the global error handler → `{ error, message, requestId }`.

## API Overview
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | /health | public | liveness + mongo state |
| POST | /auth/login | public (rate-limited) | Firebase token → session JWT pair |
| POST | /auth/refresh | public | rotate access token |
| POST | /auth/logout | any | revoke session |
| GET | /auth/me | authenticated | profile |
| POST | /auth/onboard | public (rate-limited) | register institution + head |
| POST | /auth/join | public (rate-limited) | register external user |
| GET | /registers | institution/gov | list R1–R13 metadata |
| GET/POST | /registers/:register/entries | tenant | list/create entries |
| PUT/DELETE | /registers/entries/:id | tenant | update/soft-delete |
| GET/PATCH | /inquiries(/:id) | tenant (submit: any auth) | inquiry flow |
| GET/POST/DELETE | /announcements(/:id) | read all; write head/manager | announcements |
| GET/POST/DELETE | /events(/:id) | read all; write head/manager | events |
| GET/POST/PUT/DELETE | /documents(/:id)(/download) | tenant | document management |
| GET/POST/PATCH | /master-data(/:catalog)(/:id) | read all; write gov | master data |
| GET/PUT/DELETE | /settings | tenant/gov scoped | settings |
| GET/POST | /notifications(/:id/read) | own | notifications |
| GET | /audit-logs, /activity-logs | head/manager/gov | logs |
| GET | /dashboard | authenticated | role-aware dashboard |
| GET | /rbac/roles, /rbac/departments, /rbac/permissions | authenticated | RBAC catalog |
| CRUD | /users, /tenants | tenant-scoped / gov | administration |

## Realtime
`io('/registers', auth=jwt)` → joins `tenant:<tenantId>` → events: `register:changed { register, action, entry|entryId }`.
