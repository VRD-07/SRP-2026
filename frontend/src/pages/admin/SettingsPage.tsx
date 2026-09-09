import React from 'react';
import { Sun, Moon, Shield, Database, CheckCircle, Info, Sparkles } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          System & Interface Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize UI theme mode, examine security role scopes, and system parameters.
        </p>
      </div>

      {/* Theme Selection */}
      <GlassCard variant="default" className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Interface Theme</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose between modern high-contrast Frosted Glass Dark or Light mode
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Dark Mode Card */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              theme === 'dark'
                ? 'bg-slate-900/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                : 'bg-slate-900/40 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Midnight Glass (Dark)</h4>
                  <p className="text-xs text-slate-400">Deep obsidian background with purple ambient glow</p>
                </div>
              </div>
              {theme === 'dark' && <CheckCircle className="w-5 h-5 text-indigo-400" />}
            </div>
          </div>

          {/* Light Mode Card */}
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              theme === 'light'
                ? 'bg-white/95 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                : 'bg-white/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Crystal Prism (Light)</h4>
                  <p className="text-xs text-slate-500">Frosted quartz transparency with bright contrast</p>
                </div>
              </div>
              {theme === 'light' && <CheckCircle className="w-5 h-5 text-indigo-600" />}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Account Info */}
      <GlassCard variant="default" className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Session Details</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Current institutional user credentials</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/40 dark:border-white/5">
            <span className="text-slate-500 block">Logged In Name</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{user?.name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/40 dark:border-white/5">
            <span className="text-slate-500 block">System Email</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/40 dark:border-white/5">
            <span className="text-slate-500 block">Authorization Level</span>
            <div className="mt-1">
              <GlassBadge variant="purple" size="md">
                {user?.role} (FULL PRIVILEGES)
              </GlassBadge>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Architecture & Engineering Compliance */}
      <GlassCard variant="default" className="p-6 space-y-3 text-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          Enterprise ERP Core Architectural Invariants
        </h3>

        <div className="space-y-2 text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Single Shared Calculation Engine:</strong> All dues, collections, and receipt balances
              are computed from the unified CalculationService backend query.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Immutable Transaction Ledger:</strong> No update or delete endpoints exist for
              financial transactions. Corrections are strictly modeled via audited compensating entries.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Atomic Prisma Transactions:</strong> All financial entries and sequence receipts
              execute within isolated database transactions.
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
