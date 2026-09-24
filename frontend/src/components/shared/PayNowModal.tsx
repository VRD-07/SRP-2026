import React from 'react';
import { Building2, MapPin, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';

interface PayNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeHeadName?: string;
  pendingAmount?: number;
  rollNumber?: string;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({
  isOpen,
  onClose,
  feeHeadName,
  pendingAmount,
  rollNumber,
}) => {
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Fee Remittance Instructions"
      description="Phase 1: In-Person Bursar Collection"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Due summary card */}
        {pendingAmount !== undefined && (
          <div className="p-4 rounded-2xl bg-olive-500/10 border border-olive-500/25 text-center">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted">
              {feeHeadName ? `${feeHeadName} Outstanding Amount` : 'Total Outstanding Balance'}
            </p>
            <h3 className="text-2xl font-extrabold text-olive-800 mt-1 tracking-tight">
              ₹ {pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            {rollNumber && (
              <p className="text-[11px] font-mono text-muted mt-1">
                Student ID: {rollNumber}
              </p>
            )}
          </div>
        )}

        {/* Instructions banner */}
        <div className="p-4 rounded-2xl bg-white/70 border border-olive-500/15 space-y-3 text-xs text-charcoal">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-olive-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-charcoal block text-sm">
                Pay at Central Accounts Office
              </span>
              <span className="text-muted">
                Please visit the University Bursar / Accounts Counter to complete fee payment.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-charcoal block">Location</span>
              <span className="text-muted">Administrative Block, Ground Floor, Counter Nos. 1 to 4</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-spruce flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-charcoal block">Counter Timings</span>
              <span className="text-muted">Monday to Saturday: 09:30 AM – 04:30 PM (Lunch: 01:30 PM – 02:00 PM)</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-olive-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-charcoal block">Accepted Modes</span>
              <span className="text-muted">Cash, Demand Draft (in favor of Institute Registrar), Cheque, or POS Card Swipe.</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-olive-500/10 border border-olive-500/20 text-[11px] text-olive-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-olive-700" />
          <span>
            Upon payment, the cashier will immediately issue your digitally signed receipt with a unique sequential receipt number.
          </span>
        </div>

        <div className="pt-3 border-t border-olive-500/15 flex items-center justify-end">
          <GlassButton variant="primary" onClick={onClose}>
            Understood
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};
