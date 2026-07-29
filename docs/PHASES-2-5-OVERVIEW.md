# IGOHMS — Phases 2-5 Implementation Overview

This document summarizes the resident/daily-operations, finance/HR/compliance, government-governance, AI/automation, and portal features built on top of the Phase 1 foundation.

## Stack
- Backend: Node.js + Fastify + TypeScript + Mongoose (MongoDB Atlas)
- Frontend: Expo (React Native) — web + iOS + Android
- Auth: Firebase Identity + platform JWT refresh-token session
- Real-time: Socket.io tenant-scoped rooms

## Phase 2 — Resident & Daily Operations
Implemented via the generic ERP module engine (`backend/src/modules/erp/definitions/phase2.defs.ts`):

- Resident digital profile with resident number, QR code, photo, status
- Admission workflow with statuses: applied → documents-verified → medical-cleared → approved → room-allocated → admitted (with automatic resident creation on final transition)
- Discharge, transfer, and death registers
- Family member records with visit/video-call permissions
- Room and bed management with occupancy tracking
- Medical records (EHR), nurse rounds, doctor visits
- Medicine register, pharmacy stock, medicine issues/returns
- Resident and employee attendance (manual/QR/biometric/face-ready)
- Visitor management with pass codes and blacklist support
- Kitchen menus, meal attendance, diet plans
- Store consumption, laundry, housekeeping, maintenance requests
- Emergency and incident registers
- Daily register with draft → submitted → verified → approved → locked workflow

## Phase 3 — Finance, HR, Administration & Compliance
Implemented via the generic ERP module engine (`backend/src/modules/erp/definitions/phase3.defs.ts`):

- Chart of accounts, cash book, bank book, vouchers
- Income and expense registers
- Budgets with approval workflow
- Donations with receipt and 80G tracking
- CSR projects
- Asset register, dead stock register
- Procurement, purchase orders, vendor management
- Inventory items and stock movements
- Employee records, payroll, leave management
- Trust meetings, resolutions
- Complaints and suggestions
- Licenses and compliance tracking
- Government grants
- Audits

## Phase 4 — Government Governance Platform
Implemented in `backend/src/modules/governance/`:

- Government dashboards: state, regional, district, taluka
- Institution monitoring and live monitoring
- Compliance item tracking and scoring
- Inspection scheduling, completion with GPS/QR/photos/voice notes
- Government approvals with escalation
- Monthly closing and unlock-request workflow
- Government audits, grants, emergency control center
- Analytics endpoints: resident trends, bed occupancy, health/death trends, donation/financial trends, complaint trends, grant utilization
- GIS map data endpoint
- Government circulars

## Phase 5 — AI, Automation, Portals & Production Readiness
- AI assistant (`/ai/ask`) with natural-language intent matching for common queries
- Global search (`/search`) across residents, employees, medicines, donations, complaints, assets, visitors, vendors
- Automation jobs: medicine expiry scan, license expiry scan, low-stock scan
- Reports module (`/reports/*`) with 22 report types and CSV/XLSX export
- Public portal endpoints: institution search, admission requests, complaints, feedback, volunteer registration, donation pledges
- Authenticated external portals: family, donor, volunteer
- Expo frontend with orange/white theme, dashboard, registers, modules, reports, AI chat, government dashboard, profile
- Docker + docker-compose for backend
- GitHub Actions CI workflow
- Swagger/OpenAPI documentation at `/docs`

## RBAC & Security
- All endpoints use `app.authenticate` and tenant-scoping preHandlers
- Government endpoints use `jurisdictionFilter` for state/region/district/taluka scoping
- Institution writes enforce `requireTenantScope`
- Every mutation emits an immutable audit log entry
- Reports and governance actions respect role tier

## Frontend Theme
- Primary: orange `#f97316`
- Surfaces: white `#ffffff`
- Background: light gray `#fafafa`
- Shared theme tokens in `frontend/src/config/theme.ts`
