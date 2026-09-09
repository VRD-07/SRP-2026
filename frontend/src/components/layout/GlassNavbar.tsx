import React from 'react';
import { Sun, Moon, Menu, Bell, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassBadge } from '../ui/GlassBadge';

interface GlassNavbarProps {
  onToggleMobileMenu: () => void;
  title?: string;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({ onToggleMobileMenu, title }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const roleVariant =
    user?.role === 'ADMIN' ? 'purple' : user?.role === 'CLERK' ? 'cyan' : 'info';

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/40 dark:border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {title || 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Pill */}
        <div className="hidden sm:flex items-center gap-1.5">
          <GlassBadge variant={roleVariant} size="md">
            <ShieldCheck className="w-3 h-3" />
            {user?.role} PORTAL
          </GlassBadge>
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors border border-slate-200/50 dark:border-white/5"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180 duration-200" />
          )}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200/60 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.name}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
