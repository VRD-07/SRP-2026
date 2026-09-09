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
  ShieldCheck,
  ReceiptText,
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
    { to: '/admin/fee-structures', label: 'Fee Structure', icon: Layers },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/clerks', label: 'Clerks', icon: UserCheck },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const clerkLinks = [
    { to: '/clerk', label: 'Overview', icon: LayoutDashboard },
    { to: '/clerk/collect', label: 'Collect Fees', icon: CreditCard },
    { to: '/clerk/history', label: 'Payment History', icon: History },
    { to: '/clerk/pending', label: 'Pending Dues', icon: Clock },
  ];

  const studentLinks = [
    { to: '/student', label: 'My Fees & Dues', icon: ReceiptText },
  ];

  const links =
    user?.role === 'ADMIN'
      ? adminLinks
      : user?.role === 'CLERK'
      ? clerkLinks
      : studentLinks;

  const roleVariant =
    user?.role === 'ADMIN' ? 'purple' : user?.role === 'CLERK' ? 'cyan' : 'info';

  return (
    <aside
      className={clsx(
        'w-64 flex flex-col justify-between p-4 glass-panel border-r border-white/40 dark:border-white/10 h-full select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-200/50 dark:border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-300 bg-clip-text text-transparent">
              AURA ERP
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Fees & Bursar Suite
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
                end={link.to === '/admin' || link.to === '/clerk' || link.to === '/student'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
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
      <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 space-y-3">
        <div className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-white/5 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {user?.name}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
          <GlassBadge variant={roleVariant} size="sm">
            {user?.role}
          </GlassBadge>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
