import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { GlassModal } from '../ui/GlassModal';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { Transaction, transactionService } from '../../services/transactionService';

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!transaction) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await transactionService.downloadReceipt(transaction.id, transaction.receiptNumber);
    } catch (err: any) {
      alert(`Failed to download receipt: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const isReversed = transaction.status === 'REVERSED';

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Transaction Receipt Voucher"
      description={`Receipt #${transaction.receiptNumber}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-white/70 border border-olive-500/15 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-olive-500/10 text-olive-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted font-medium">Total Amount</p>
              <h4 className="text-xl font-bold text-charcoal">
                ₹ {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
          <GlassBadge variant={isReversed ? 'danger' : 'success'} size="md">
            {isReversed ? 'REVERSED' : 'SUCCESSFUL'}
          </GlassBadge>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block font-medium">Student</span>
            <span className="font-bold text-charcoal">
              {transaction.student.name} ({transaction.student.rollNumber})
            </span>
            <span className="block text-[11px] text-muted mt-0.5">
              {transaction.student.class} • {transaction.student.batch}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block font-medium">Fee Particulars</span>
            <span className="font-bold text-charcoal">
              {transaction.feeAssignment.feeStructure.feeHead} Fee
            </span>
            <span className="block text-[11px] text-muted mt-0.5">
              AY {transaction.feeAssignment.feeStructure.academicYear}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block font-medium">Payment Mode</span>
            <span className="font-bold text-charcoal">{transaction.paymentMode}</span>
            <span className="block text-[11px] text-muted mt-0.5">Ref: {transaction.referenceNumber}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/55 border border-olive-500/15">
            <span className="text-muted block font-medium">Cashier / Clerk</span>
            <span className="font-bold text-charcoal">
              {transaction.recordedByClerk.name}
            </span>
            <span className="block text-[11px] text-muted mt-0.5">{transaction.recordedByClerk.email}</span>
          </div>
        </div>

        {transaction.reversalReason && (
          <div className="p-3 rounded-xl bg-terracotta/10 border border-terracotta/20 text-xs text-terracotta-700">
            <span className="font-bold block mb-0.5">Reversal Audit Note:</span>
            {transaction.reversalReason}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-olive-500/15 flex items-center justify-end gap-2">
          <GlassButton variant="secondary" onClick={onClose}>
            Close
          </GlassButton>
          <GlassButton
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            isLoading={downloading}
            onClick={handleDownload}
          >
            Download PDF Receipt
          </GlassButton>
        </div>
      </div>
    </GlassModal>
  );
};
