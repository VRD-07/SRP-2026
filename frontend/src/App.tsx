import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { GlassLayout } from './components/layout/GlassLayout';

// Pages - Auth
import { LoginPage } from './pages/auth/LoginPage';

// Pages - Admin
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { FeeStructuresPage } from './pages/admin/FeeStructuresPage';
import { StudentsPage } from './pages/admin/StudentsPage';
import { TeachersPage } from './pages/admin/TeachersPage';
import { AttendanceReportsPage } from './pages/admin/AttendanceReportsPage';
import { ClerksPage } from './pages/admin/ClerksPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { LibraryAdminPage } from './pages/admin/LibraryAdminPage';

// Pages - Clerk
import { ClerkDashboard } from './pages/clerk/ClerkDashboard';
import { CollectFeesPage } from './pages/clerk/CollectFeesPage';
import { PaymentHistoryPage } from './pages/clerk/PaymentHistoryPage';
import { PendingDuesPage } from './pages/clerk/PendingDuesPage';
import { LibraryCirculationPage } from './pages/clerk/LibraryCirculationPage';

// Pages - Teacher
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { MarkAttendancePage } from './pages/teacher/MarkAttendancePage';
import { AttendanceHistoryPage } from './pages/teacher/AttendanceHistoryPage';

// Pages - Student
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendancePage } from './pages/student/StudentAttendancePage';
import { StudentLibraryPage } from './pages/student/StudentLibraryPage';

// Pages - Common / Unified
import { StudentProfilePage } from './pages/common/StudentProfilePage';

// Role Guard Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold">Validating session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to respective authorized dashboard
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
    if (user.role === 'CLERK') return <Navigate to="/clerk" replace />;
    if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Root index redirector
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />;
  if (user.role === 'CLERK') return <Navigate to="/clerk" replace />;
  if (user.role === 'STUDENT') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Direct Login Screen */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <GlassLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="fee-structures" element={<FeeStructuresPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentProfilePage />} />
              <Route path="teachers" element={<TeachersPage />} />
              <Route path="attendance-reports" element={<AttendanceReportsPage />} />
              <Route path="library" element={<LibraryAdminPage />} />
              <Route path="clerks" element={<ClerksPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Teacher Portal */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['TEACHER']}>
                  <GlassLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="mark" element={<MarkAttendancePage />} />
              <Route path="history" element={<AttendanceHistoryPage />} />
            </Route>

            {/* Clerk Portal */}
            <Route
              path="/clerk"
              element={
                <ProtectedRoute allowedRoles={['CLERK']}>
                  <GlassLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClerkDashboard />} />
              <Route path="collect" element={<CollectFeesPage />} />
              <Route path="library" element={<LibraryCirculationPage />} />
              <Route path="history" element={<PaymentHistoryPage />} />
              <Route path="pending" element={<PendingDuesPage />} />
            </Route>

            {/* Student Portal */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <GlassLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="attendance" element={<StudentAttendancePage />} />
              <Route path="library" element={<StudentLibraryPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>

            {/* Root & Fallback */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
