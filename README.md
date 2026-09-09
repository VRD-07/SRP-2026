# AURA ERP — College Fees Management System (Phase 1)

A production-ready, full-stack College Fees Management System with a modern glassmorphic interface, built for enterprise institutional finance operations.

---

## 💎 Design System & Glassmorphism Aesthetics

- **Frosted-Glass Architecture**: Semi-transparent layered cards (`rgba(255,255,255,0.7)` light / `rgba(15,23,42,0.65)` dark), `backdrop-filter: blur(18px)`, subtle 1px low-opacity borders, and soft layered ambient shadows.
- **Ambient Mesh Canvas**: Radial gradients with muted blues, purples, and teals that make the backdrop-filter blur visibly shimmer behind panels.
- **Full Dark & Light Modes**: Accessible switch in Settings or top navigation bar with persistent local state.
- **Responsive Layouts**: Desktop persistent sidebar, collapsible navigation, mobile drawer sheet, mobile bottom quick-bar, and automatic conversion of data tables to stacked cards on small screens.
- **WCAG AA Compliance**: High-contrast typography and semantic color tokens across all themes.

---

## 🏛️ System Roles & Demo Credentials

Pre-seeded institutional accounts for live client demonstrations:

| Portal | Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `ADMIN` | `admin@college.edu` | `Admin@123` | Full CRUD for fee heads, student registry, cashier accounts, financial reports, ledger reversals |
| **Cashier / Clerk** | `CLERK` | `clerk.raj@college.edu` | `Clerk@123` | Live student search, fee collection, instant PDF receipts, payment history, pending dues list |
| **Student** | `STUDENT` | `student.aarav@college.edu` | `Student@123` | Real-time fee breakdown by head, outstanding dues, downloadable receipts, "Pay Now" counter instructions |

*(Additional cashier: `clerk.anita@college.edu` / `Clerk@123`)*

---

## ⚙️ Core Engineering Invariants

1. **Single Shared Calculation Engine (`calculationService.ts`)**:
   - All financial math (assigned amount, verified paid amount, pending dues, overdue status) is executed by a single source of truth in the backend.
   - Dashboard KPI metrics, receipt voucher figures, clerk collection balances, and reports always match to the exact rupee.
2. **Immutable Financial Ledger**:
   - Strictly **NO** `UPDATE`, `PUT`, `PATCH`, or `DELETE` endpoints exist for the `Transaction` resource.
   - Adjustments or dishonored cheques are modeled as new `REVERSED` compensating transactions referencing the original transaction ID with mandatory audit reasons.
3. **Atomic Execution**:
   - All transactions, receipt sequence increments, and reversal links execute inside isolated `prisma.$transaction` calls.
4. **Dual-Layer Validation**:
   - Strictly prevents negative amounts, overpayment beyond outstanding balance (unless explicitly confirmed via override), and missing references on both client and server independently.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js (v18+ or v22+)
- PostgreSQL (Local or Cloud instance like Neon, Supabase, or Railway)

### 1. Clone & Configure Environment
Clone the repository and copy the environment configuration:
```bash
# Backend Environment
cp backend/.env.example backend/.env

# Frontend Environment
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` to configure your PostgreSQL connection string:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/college_erp?schema=public"
JWT_SECRET="college_fees_erp_super_secret_jwt_key_2026_prod"
JWT_EXPIRES_IN="1d"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

### 2. Install Dependencies
```bash
npm run install:all
```
*Or individually:*
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Initialize Database Schema & Seed Realistic Demo Data
```bash
# Push Prisma schema to PostgreSQL
npm --prefix backend run prisma:push

# Populate realistic students, fee structures, payments, and reversal audit records
npm --prefix backend run seed
```

### 4. Run Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

---

## 🌐 Production Deployment Guide

### Option A: Render (Turnkey Blueprint)
This repository includes a `render.yaml` blueprint:
1. Connect your GitHub repository to Render.
2. Choose **New > Blueprint**.
3. Render automatically provisions:
   - A managed PostgreSQL database (`college-fees-db`)
   - A Node.js web service for the backend (`college-fees-backend`)
   - Configures `DATABASE_URL`, builds Prisma schema, and launches the server.

### Option B: Vercel (Frontend)
1. Import the repository into Vercel.
2. Root Directory: `frontend`
3. Framework Preset: `Vite`
4. Environment Variables:
   - `VITE_API_URL`: Your deployed backend API URL (e.g. `https://college-fees-backend.onrender.com/api`)
5. Deploy.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login`: Authenticates user, returns JWT and user profile.
- `GET /api/auth/me`: Validates session and returns current user details.

### Fee Structures (`ADMIN` only for mutations)
- `GET /api/fee-structures`: List fee heads (filter by class, batch, academicYear).
- `POST /api/fee-structures`: Create fee head structure.
- `PUT /api/fee-structures/:id`: Update fee head.
- `DELETE /api/fee-structures/:id`: Delete fee head (protected against assigned heads).

### Students
- `GET /api/students`: List students with real-time dues summary (`ADMIN`, `CLERK`).
- `GET /api/students/:id`: Get student account & fee breakdown (`ADMIN`, `CLERK`).
- `POST /api/students`: Register student and auto-assign fee structures (`ADMIN`).
- `PUT /api/students/:id`: Update student record (`ADMIN`).
- `POST /api/students/:id/assignments`: Assign fee heads (`ADMIN`).
- `GET /api/students/me`: Logged-in student's live dues and payment ledger (`STUDENT`).

### Cashier & Staff Management (`ADMIN`)
- `GET /api/clerks`: List all cashier accounts and recorded transaction totals.
- `POST /api/clerks`: Create cashier account.
- `PATCH /api/clerks/:id/toggle`: Activate or deactivate clerk account.
- `POST /api/clerks/:id/reset-password`: Reset cashier credentials.

### Transactions & Ledger
- `POST /api/transactions`: Record fee deposit inside atomic transaction (`ADMIN`, `CLERK`).
- `GET /api/transactions`: Query transaction ledger with filters (`ADMIN`, `CLERK`, `STUDENT`).
- `GET /api/transactions/:id/receipt`: Stream official vector PDF receipt (`ADMIN`, `CLERK`, `STUDENT`).
- `POST /api/transactions/:id/reverse`: Issue an audited compensating reversal entry (`ADMIN`, `CLERK`).

### Financial Reports
- `GET /api/reports/overview`: Real-time KPI summaries and Recharts data.
- `GET /api/reports/dues`: Real-time list of students with outstanding dues.
- `GET /api/reports/export-csv`: Stream RFC4180-compliant CSV report.
