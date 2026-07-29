# IGOHMS — Business Requirement Document (BRD)

## 1. Purpose
Maharashtra Integrated Old Age Home Management System (IGOHMS) digitizes record-keeping and monitoring for every registered Old Age Home in Maharashtra, replacing 13 paper registers with a centralized, multi-tenant government ERP.

## 2. Stakeholders
| Stakeholder | Interest |
|---|---|
| Maharashtra Government (Social Justice Dept.) | Real-time oversight of all institutions |
| Institution Head | Statutory register upkeep, audit readiness |
| Assistant Manager | Day-to-day register operations |
| Department Users | Department-scoped data entry |
| Family / Donor / Citizen | Inquiries, announcements, events |
| Vendor (client) | Sellable, defensible product |

## 3. Business Objectives
1. Single source of truth for all 13 statutory registers per institution.
2. Strict tenant isolation: institution A can never see institution B.
3. Government read-visibility scoped by jurisdiction (state/region/district/taluka).
4. Immutable audit trail for every mutation (government audit parity).
5. Marathi-first UI, English second; usable by low-digital-literacy staff.
6. Web + Android + iOS from one codebase.

## 4. Scope (Phase 1-5 delivered)
- Multi-tenant backend with RBAC (government / institution / external tiers).
- 13 digital registers (R1–R13) with sequential entry numbers `REG<YEAR>-<6-digit>`.
- Inquiries, announcements, events, documents, notifications, dashboard, master data, settings.
- Real-time register grid updates via Socket.io.
- Firebase authentication + platform session JWT with refresh tokens and device tracking.
- Docker packaging + CI workflow.

## 5. Out of scope (future)
- Payment gateway for donations, biometric login, WhatsApp/SMS provider wiring (engine-ready), Kubernetes manifests, Orphanages/Women Shelters etc. (architecture-ready).

## 6. Success Metrics
- 100% of register writes carry sequential IDs + audit records.
- Zero cross-tenant data leaks (enforced at middleware, not route handlers).
- Login-to-dashboard under 3 seconds on government broadband.
