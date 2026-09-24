import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { Transaction, transactionService } from '../../services/transactionService';

interface ReversalModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reversedTx: Transaction) => void;
}

export const ReversalModal: React.FC<ReversalModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for reversing this transaction.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await transactionService.reverse(transaction.id, reason.trim());
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reverse transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate Transaction Reversal"
      description={`Original Receipt: ${transaction.receiptNumber}`}
      maxWidth="md"
    >
      <form onSubmit={handleReverse} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-gold/15 border border-gold/30 text-xs text-gold-700 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-gold mt-0.5" />
          <div>
            <span className="font-bold block text-charcoal">Immutable Accounting Record Notice:</span>
            Transactions cannot be altered or deleted. A new compensating transaction with status
            REVERSED will be permanently written to the ledger, restoring the student's pending
            due balance.
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white/60 border border-olive-500/15 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted">Student:</span>
            <span className="font-bold text-charcoal">{transaction.student.name} ({transaction.student.rollNumber})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Amount to Reverse:</span>
            <span className="font-bold text-terracotta">
              ₹ {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
            Reversal Audit Reason <span className="text-terracotta">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cheque bounced / Instrument dishonored by bank, Duplicate cash entry by clerk, Wrong student account selected..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/70 backdrop-blur-md text-charcoal placeholder-muted/60 border border-olive-500/20 focus:outline-none focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta transition-all"
          />
        </div>

        {error && <p className="text-xs text-terracotta font-medium">{error}</p>}

        <div className="pt-3 border-t border-olive-500/15 flex items-center justify-end gap-2">
          <GlassButton type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </GlassButton>
          <GlassButton type="submit" variant="danger" isLoading={loading}>
            Confirm Reversal
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
