# AURA ERP — College Management System (Phase 2)

A production-grade, full-stack College ERP with a modern glassmorphic interface, unifying Student Admissions, Academic Attendance, and Enterprise Fees Operations into a single relational architecture.

---

## 💎 Design System & Glassmorphic Aesthetics

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
| **Admin** | `ADMIN` | `admin@college.edu` | `Admin@123` | Full ERP control: Admissions CRUD, Faculty management, Attendance audits & CSV export, Fee structures, Cashiers, Financial reports |
| **Faculty / Teacher** | `TEACHER` | `teacher.sunita@college.edu` | `Teacher@123` | Assigned classes only: Daily attendance marking (`PRESENT`, `ABSENT`, `LATE`), roster audits, remarks, session history |
| **Cashier / Clerk** | `CLERK` | `clerk.raj@college.edu` | `Clerk@123` | Live student search, fee collection, instant PDF receipts, payment history, pending dues list |
| **Student** | `STUDENT` | `student.aarav@college.edu` | `Student@123` | Unified Profile: Admissions dossier, real-time fee breakdown by head, outstanding dues, attendance percentage & session timeline |

### Additional Seeded Accounts:
- **Teachers**:
  - `teacher.rajesh@college.edu` / `Teacher@123` (CS-Year 1 Sec A, MECH-Year 2 Sec A)
  - `teacher.ananya@college.edu` / `Teacher@123` (ECE-Year 3 Sec A, CS-Year 4 Sec A)
  - `teacher.vikram@college.edu` / `Teacher@123` (CIVIL-Year 1 Sec A, EEE-Year 2 Sec A)
- **Clerks**: `clerk.anita@college.edu` / `Clerk@123`
- **Students**: 10 fully enrolled students with admission dossiers, fee assignments, transaction ledgers, and 3 weeks of attendance history.

---

## ⚙️ Core Engineering Invariants

1. **Single Source of Truth (`Student` Model)**:
   - Admissions, Fees, and Attendance reference the **exact same** `Student` record (`id`, `rollNumber`, `admissionNumber`).
   - No parallel student tables or duplicated records exist.
2. **Strict Server-Side RBAC**:
   - Teachers can **only** mark attendance for classes explicitly listed in their `classesAssigned` JSON matrix (`requireTeacherClassAccess` middleware).
   - Clerks are strictly locked out (HTTP 403) from attendance endpoints.
   - Students can only view their own attendance records and profile.
3. **Compound Unique Constraints & Idempotency**:
   - `AttendanceSession`: Unique on `[class, section, date]` ensures zero duplicate sessions per day.
   - `AttendanceRecord`: Unique on `[attendanceSessionId, studentId]` ensures idempotent re-marking without inflating statistics.
   - `FeeAssignment`: Unique on `[studentId, feeStructureId]` prevents duplicate fee obligations.
4. **Single Shared Calculation Engine (`calculationService.ts`)**:
   - All financial math (assigned, collected, pending dues, overdue status) is executed by a single backend service.
   - Reused inside the Unified Student Profile (`GET /api/students/:id/profile`).
5. **Immutable Financial Ledger**:
   - Strictly **NO** `UPDATE` or `DELETE` endpoints exist for the `Transaction` table.
   - Adjustments or bounces use audited compensating `REVERSED` entries.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- Node.js (v18+ or v22+)
- PostgreSQL (Local or Cloud instance like Neon, Supabase, or Railway)

### 1. Configure Environment
```bash
# Backend Environment
cp backend/.env.example backend/.env

# Frontend Environment
cp frontend/.env.example frontend/.env
```

Configure your PostgreSQL connection string in `backend/.env`:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/college_erp?schema=public"
JWT_SECRET="college_fees_erp_super_secret_jwt_key_2026_prod"
JWT_EXPIRES_IN="1d"
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

### 2. Initialize Database Schema & Seed Data
```bash
# Apply schema to PostgreSQL
npm --prefix backend run prisma:push

# Seed faculty, students, admissions dossiers, fee structures, and 3 weeks of attendance sessions
npm --prefix backend run seed
```

### 3. Run Development Servers
```bash
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

### 4. Run Automated Test Suite
```bash
npm --prefix backend run test
```
*(Executes 43 tests across 6 suites covering financial logic, concurrency, access control, raw SQL reconciliation, input validation, admissions, and attendance)*

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login`: Authenticates user, returns JWT and user profile (including teacher assignment metadata).
- `GET /api/auth/me`: Validates session and returns current user details.

### Student Admissions & Records (`ADMIN`, `CLERK`, `STUDENT`)
- `GET /api/students`: List and search students with class, section, and status filters.
- `GET /api/students/:id`: Get basic student account details and fee summary.
- `GET /api/students/:id/profile`: **Unified Student Profile** (Admissions dossier + live Fees calculation + Attendance turnout).
- `GET /api/students/me/profile`: Logged-in student's unified profile view.
- `GET /api/students/me`: Logged-in student's live dues and payment ledger.
- `POST /api/students`: Create new student admission with guardian info and documents (`ADMIN`).
- `PUT /api/students/:id`: Update student admission dossier (`ADMIN`).
- `PATCH /api/students/:id/status`: Soft activate/deactivate student (`ADMIN`).
- `POST /api/students/:id/assignments`: Assign fee heads (`ADMIN`).

### Teacher Management (`ADMIN`, `TEACHER`)
- `GET /api/teachers`: List faculty with employee ID, subjects, and assigned classes (`ADMIN`).
- `POST /api/teachers`: Create faculty account with login credentials and class matrix (`ADMIN`).
- `GET /api/teachers/:id`: View teacher profile (`ADMIN`).
- `PUT /api/teachers/:id`: Update teacher details and class section assignments (`ADMIN`).
- `PATCH /api/teachers/:id/status`: Activate or deactivate teacher account (`ADMIN`).
- `POST /api/teachers/:id/reset-password`: Reset teacher password (`ADMIN`).
- `GET /api/teachers/me/assignments`: Fetch logged-in teacher's assigned classes (`TEACHER`).

### Attendance Module (`TEACHER`, `ADMIN`, `STUDENT`)
- `GET /api/attendance/roster`: Fetch student roster for a class/section with existing marks (`TEACHER`).
- `POST /api/attendance/mark`: Atomically record daily attendance (`TEACHER` assigned to class).
- `GET /api/attendance/sessions`: List past attendance sessions with filters (`TEACHER`, `ADMIN`).
- `GET /api/attendance/sessions/:id`: Get detailed session marks for editing (`TEACHER`).
- `PUT /api/attendance/sessions/:id`: Update session marks and remarks (`TEACHER`).
- `GET /api/attendance/reports`: Institutional attendance reports with per-student percentage (`ADMIN`).
- `GET /api/attendance/reports/export`: Export attendance report as RFC4180 CSV (`ADMIN`).
- `GET /api/attendance/my-attendance`: Student personal attendance history and examination clearance status (`STUDENT`).

### Fee Structures & Financial Ledger
- `GET /api/fee-structures`: List fee heads with filters (`ADMIN`).
- `POST /api/fee-structures`: Create fee head (`ADMIN`).
- `POST /api/transactions`: Record fee deposit inside atomic transaction (`ADMIN`, `CLERK`).
- `GET /api/transactions`: Query transaction ledger with filters (`ADMIN`, `CLERK`, `STUDENT`).
- `GET /api/transactions/:id/receipt`: Stream vector PDF receipt (`ADMIN`, `CLERK`, `STUDENT`).
- `POST /api/transactions/:id/reverse`: Issue an audited compensating reversal entry (`ADMIN`, `CLERK`).
- `GET /api/reports/overview`: Real-time KPI summaries and Recharts data (`ADMIN`).
