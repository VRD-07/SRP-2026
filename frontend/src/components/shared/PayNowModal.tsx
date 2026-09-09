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
  // Phase 1: Physical cash / desk payment instructions.
  // Architecture Ready for Phase 2: In Phase 2, this handler will invoke window.Razorpay({...})
  const handleInitiateOnlineCheckout = () => {
    // Placeholder architecture hook for future payment gateway:
    // const rzp = new window.Razorpay(options);
    // rzp.open();
    alert('Online Gateway Integration: Scheduled for Phase 2. Please remit at accounts counter.');
  };

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
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-center">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              {feeHeadName ? `${feeHeadName} Outstanding Amount` : 'Total Outstanding Balance'}
            </p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              ₹ {pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            {rollNumber && (
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1">
                Student ID: {rollNumber}
              </p>
            )}
          </div>
        )}

        {/* Instructions banner */}
        <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                Pay at Central Accounts Office
              </span>
              <span>
                Please visit the University Bursar / Accounts Counter to complete fee payment.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Location</span>
              <span>Administrative Block, Ground Floor, Counter Nos. 1 to 4</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Counter Timings</span>
              <span>Monday to Saturday: 09:30 AM – 04:30 PM (Lunch: 01:30 PM – 02:00 PM)</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-white block">Accepted Modes</span>
              <span>Cash, Demand Draft (in favor of Institute Registrar), Cheque, or POS Card Swipe.</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-indigo-500" />
          <span>
            Upon payment, the cashier will immediately issue your digitally signed receipt with a unique sequential receipt number.
          </span>
        </div>

        <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end">
          <GlassButton variant="primary" onClick={onClose}>
            Understood
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};
