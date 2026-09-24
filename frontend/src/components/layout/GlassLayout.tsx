import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlassSidebar } from './GlassSidebar';
import { GlassNavbar } from './GlassNavbar';
import { MobileDrawer, MobileBottomNav } from './MobileNav';

interface GlassLayoutProps {
  title?: string;
}

export const GlassLayout: React.FC<GlassLayoutProps> = ({ title }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Dynamic title based on pathname
  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path.includes('/fee-structures')) return 'Fee Structure Management';
    if (path.includes('/teachers')) return 'Faculty & Teacher Management';
    if (path.includes('/attendance-reports')) return 'Institutional Attendance Reports';
    if (path.includes('/teacher/mark')) return 'Mark Daily Attendance';
    if (path.includes('/teacher/history')) return 'Teacher Attendance Log';
    if (path.includes('/students') && path.split('/').length > 3) return 'Unified Student Profile';
    if (path.includes('/students')) return 'Student Records & Admissions';
    if (path.includes('/clerks')) return 'Staff & Cashier Directory';
    if (path.includes('/reports')) return 'Financial Reports & Analytics';
    if (path.includes('/settings')) return 'System Settings';
    if (path.includes('/collect')) return 'Collect Student Fees';
    if (path.includes('/history')) return 'Payment History & Ledger';
    if (path.includes('/pending')) return 'Pending Outstanding Dues';
    if (path.includes('/student/attendance')) return 'My Attendance Record';
    if (path.includes('/student/profile')) return 'My Unified Profile';
    if (path.includes('/student')) return 'Student Fee Portal';
    return 'Executive Overview';
  };

  return (
    <div className="min-h-screen flex text-charcoal relative selection:bg-olive-600 selection:text-white">
      {/* Ambient Animated Mesh Background */}
      <div className="ambient-mesh-bg" />

      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 z-40">
        <GlassSidebar />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-16 lg:pb-6">
        <GlassNavbar
          title={getPageTitle()}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Quick-Navigation */}
      <MobileBottomNav />
    </div>
  );
};
