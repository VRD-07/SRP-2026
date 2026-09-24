import React from 'react';
import { Shield, CheckCircle, Palette, Sparkles, Layers } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-charcoal tracking-tight">
          System & Interface Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Interface design specifications, security role scopes, and system parameters.
        </p>
      </div>

      {/* Design System Specification */}
      <GlassCard variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
              <Palette className="w-4 h-4 text-olive-600" />
              Active Design System
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Consumer-grade Light Glassmorphism with Warm Off-White & Olive Palette
            </p>
          </div>
          <GlassBadge variant="success" size="md">
            Active Theme
          </GlassBadge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/60 border border-olive-500/15">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Canvas Base</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-4 h-4 rounded-full bg-[#FAF9F5] border border-stone-300 shadow-xs"></span>
              <span className="text-xs font-bold text-charcoal">#FAF9F5 Warm Off-White</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/60 border border-olive-500/15">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Brand Accent</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-4 h-4 rounded-full bg-[#6B7A4F] shadow-xs"></span>
              <span className="text-xs font-bold text-charcoal">#6B7A4F Olive Green</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/60 border border-olive-500/15">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Typography</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-extrabold text-charcoal">Aa</span>
              <span className="text-xs font-bold text-charcoal">Manrope Sans-Serif</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Account Info */}
      <GlassCard variant="default" className="p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-charcoal">Active Session Details</h3>
          <p className="text-xs text-muted">Current institutional user credentials</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block">Logged In Name</span>
            <span className="font-bold text-charcoal text-sm">{user?.name}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block">System Email</span>
            <span className="font-bold text-charcoal text-sm">{user?.email}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block">Authorization Level</span>
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
        <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
          <Shield className="w-4 h-4 text-olive-700" />
          Enterprise ERP Core Architectural Invariants
        </h3>

        <div className="space-y-2 text-charcoal">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-olive-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Single Shared Calculation Engine:</strong> All dues, collections, and receipt balances
              are computed from the unified CalculationService backend query.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-olive-700 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Immutable Transaction Ledger:</strong> No update or delete endpoints exist for
              financial transactions. Corrections are strictly modeled via audited compensating entries.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-olive-700 flex-shrink-0 mt-0.5" />
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
