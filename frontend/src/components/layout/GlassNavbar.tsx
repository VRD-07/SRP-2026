import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlassBadge } from '../ui/GlassBadge';

interface GlassNavbarProps {
  onToggleMobileMenu: () => void;
  title?: string;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({ onToggleMobileMenu, title }) => {
  const { user } = useAuth();

  const roleVariant =
    user?.role === 'ADMIN' ? 'purple' : user?.role === 'CLERK' ? 'cyan' : 'info';

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/65 px-4 sm:px-6 py-3.5 flex items-center justify-between transition-colors shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-xl text-muted hover:text-charcoal hover:bg-white/60 lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-charcoal flex items-center gap-2 tracking-tight">
            {title || 'Dashboard'}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Role Pill */}
        <div className="hidden sm:flex items-center gap-1.5">
          <GlassBadge variant={roleVariant} size="md">
            <ShieldCheck className="w-3.5 h-3.5" />
            {user?.role} PORTAL
          </GlassBadge>
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-olive-500/15">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-olive-600 to-olive-500 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-charcoal leading-tight">
              {user?.name}
            </p>
            <p className="text-[11px] text-muted leading-tight mt-0.5">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
