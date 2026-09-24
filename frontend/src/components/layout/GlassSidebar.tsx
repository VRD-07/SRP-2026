import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  CreditCard,
  History,
  Clock,
  LogOut,
  GraduationCap,
  CalendarCheck,
  UserSquare2,
  FileSpreadsheet,
  UserCheck2,
  BookOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { GlassBadge } from '../ui/GlassBadge';

interface GlassSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({ className, onNavigate }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Student Records', icon: Users },
    { to: '/admin/teachers', label: 'Teachers', icon: UserSquare2 },
    { to: '/admin/attendance-reports', label: 'Attendance Reports', icon: FileSpreadsheet },
    { to: '/admin/library', label: 'Library & Books', icon: BookOpen },
    { to: '/admin/fee-structures', label: 'Fee Structure', icon: Layers },
    { to: '/admin/clerks', label: 'Clerks', icon: UserCheck },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const teacherLinks = [
    { to: '/teacher', label: 'Overview', icon: LayoutDashboard },
    { to: '/teacher/mark', label: 'Mark Attendance', icon: CalendarCheck },
    { to: '/teacher/history', label: 'Attendance History', icon: History },
  ];

  const clerkLinks = [
    { to: '/clerk', label: 'Overview', icon: LayoutDashboard },
    { to: '/clerk/collect', label: 'Collect Fees', icon: CreditCard },
    { to: '/clerk/library', label: 'Library Desk', icon: BookOpen },
    { to: '/clerk/history', label: 'Payment History', icon: History },
    { to: '/clerk/pending', label: 'Pending Dues', icon: Clock },
  ];

  const studentLinks = [
    { to: '/student', label: 'My Fees & Dues', icon: CreditCard },
    { to: '/student/attendance', label: 'My Attendance', icon: CalendarCheck },
    { to: '/student/library', label: 'My Library', icon: BookOpen },
    { to: '/student/profile', label: 'My Profile', icon: UserCheck2 },
  ];

  const links =
    user?.role === 'ADMIN'
      ? adminLinks
      : user?.role === 'TEACHER'
      ? teacherLinks
      : user?.role === 'CLERK'
      ? clerkLinks
      : studentLinks;

  const roleVariant: any =
    user?.role === 'ADMIN'
      ? 'purple'
      : user?.role === 'TEACHER'
      ? 'success'
      : user?.role === 'CLERK'
      ? 'cyan'
      : 'info';

  return (
    <aside
      className={clsx(
        'w-64 flex flex-col justify-between p-4 glass-panel border-r border-white/65 h-full select-none shadow-sm',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-3.5 mb-4 border-b border-olive-500/15">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-olive-700 via-olive-600 to-olive-500 flex items-center justify-center text-white shadow-sm shadow-olive-600/25">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-charcoal leading-none">
              AURA <span className="text-olive-600">ERP</span>
            </h1>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-1">
              Bursar & Academic Suite
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin' || link.to === '/clerk' || link.to === '/student' || link.to === '/teacher'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150',
                    isActive
                      ? 'bg-olive-600 text-white font-semibold shadow-sm shadow-olive-600/20'
                      : 'text-muted font-medium hover:bg-white/65 hover:text-charcoal'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer & Logout */}
      <div className="pt-4 border-t border-olive-500/15 space-y-3">
        <div className="p-3 rounded-2xl bg-white/65 border border-white/80 shadow-xs flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-charcoal truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-muted truncate">{user?.email}</p>
          </div>
          <GlassBadge variant={roleVariant} size="sm">
            {user?.role}
          </GlassBadge>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
