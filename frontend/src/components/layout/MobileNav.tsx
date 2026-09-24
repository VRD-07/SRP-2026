import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Clock, History, Layers, Users, BarChart3, CalendarCheck, UserCheck2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { GlassSidebar } from './GlassSidebar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-72 max-w-full h-full z-10 animate-in slide-in-from-left duration-200">
        <GlassSidebar onNavigate={onClose} />
      </div>
    </div>
  );
};

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();

  const adminLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/fee-structures', label: 'Fees', icon: Layers },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ];

  const teacherLinks = [
    { to: '/teacher/mark', label: 'Mark', icon: CalendarCheck },
    { to: '/teacher/history', label: 'History', icon: History },
  ];

  const clerkLinks = [
    { to: '/clerk', label: 'Overview', icon: LayoutDashboard },
    { to: '/clerk/collect', label: 'Collect', icon: CreditCard },
    { to: '/clerk/pending', label: 'Pending', icon: Clock },
    { to: '/clerk/history', label: 'History', icon: History },
  ];

  const studentLinks = [
    { to: '/student', label: 'My Fees', icon: CreditCard },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/student/profile', label: 'Profile', icon: UserCheck2 },
  ];

  const links =
    user?.role === 'ADMIN'
      ? adminLinks
      : user?.role === 'TEACHER'
      ? teacherLinks
      : user?.role === 'CLERK'
      ? clerkLinks
      : studentLinks;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/65 px-2 py-1.5 flex items-center justify-around shadow-sm">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin' || link.to === '/clerk' || link.to === '/student'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-colors',
                isActive
                  ? 'text-olive-700 bg-olive-500/15'
                  : 'text-muted hover:text-charcoal'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
