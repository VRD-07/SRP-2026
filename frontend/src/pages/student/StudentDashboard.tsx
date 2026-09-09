import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  ReceiptText,
  Clock,
  Building2,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { studentService, StudentFeeSummary, FeeHeadBreakdown } from '../../services/studentService';
import { transactionService, Transaction } from '../../services/transactionService';
import { PayNowModal } from '../../components/shared/PayNowModal';
import { ReceiptModal } from '../../components/shared/ReceiptModal';

export const StudentDashboard: React.FC = () => {
  const [profileData, setProfileData] = useState<{
    student: any;
    summary: StudentFeeSummary;
    transactions: Transaction[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [payNowOpen, setPayNowOpen] = useState(false);
  const [selectedPayHead, setSelectedPayHead] = useState<FeeHeadBreakdown | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const res = await studentService.getMyProfile();
      if (res.success) {
        setProfileData(res.data);
      }
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfile();
  }, []);

  const summary = profileData?.summary;
  const student = profileData?.student;
  const transactions = profileData?.transactions || [];

  const handleOpenPay = (head?: FeeHeadBreakdown) => {
    setSelectedPayHead(head || null);
    setPayNowOpen(true);
  };

  const transactionColumns: Column<Transaction>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt #',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {item.receiptNumber}
        </span>
      ),
    },
    {
      key: 'feeHead',
      header: 'Fee Head',
      render: (item) => (
        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
          {item.feeAssignment.feeStructure.feeHead} Fee
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      render: (item) => {
        const isReversed = item.status === 'REVERSED';
        return (
          <span
            className={`font-bold text-xs ${
              isReversed ? 'text-rose-600 dark:text-rose-400 line-through' : 'text-slate-900 dark:text-white'
            }`}
          >
            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'paymentMode',
      header: 'Mode & Ref',
      render: (item) => (
        <div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
            {item.paymentMode}
          </span>
          <span className="text-[10px] text-slate-500 block">Ref: {item.referenceNumber}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Payment Date',
      render: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            dateStyle: 'medium',
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <GlassBadge variant={item.status === 'SUCCESS' ? 'success' : 'danger'} size="sm">
          {item.status}
        </GlassBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Receipt',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedTx(item);
              setReceiptOpen(true);
            }}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            PDF Receipt
          </GlassButton>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <GlassCard className="p-16 text-center">
        <div className="inline-flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Loading your fee profile and official bursar statements...
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Profile & Overview Header */}
      <GlassCard variant="elevated" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/30">
              {student?.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                  {student?.name}
                </h1>
                <GlassBadge variant="info">Student Portal</GlassBadge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Roll Number: {student?.rollNumber} • Class: {student?.class} (Batch {student?.batch})
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contact: {student?.contactNumber}
              </p>
            </div>
          </div>

          {/* Outstanding Balance Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 border border-indigo-500/30 text-left md:text-right flex flex-col md:items-end justify-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Current Outstanding Balance
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black mt-0.5 ${
                summary && summary.totalPending > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              ₹ {(summary?.totalPending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {summary?.nextDueDate && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3.5 h-3.5" /> Next Due:{' '}
                <strong className={summary.hasOverdue ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>
                  {new Date(summary.nextDueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </strong>
              </span>
            )}

            {summary && summary.totalPending > 0 && (
              <GlassButton
                variant="primary"
                size="sm"
                className="mt-3 w-full md:w-auto"
                onClick={() => handleOpenPay()}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                Pay Outstanding Fees
              </GlassButton>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Fee Breakdown by Head */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Semester Fee Breakdown by Particulars
          </h2>
          <span className="text-xs text-slate-500">Live breakdown computed by Bursar Service</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary?.heads.map((head) => (
            <GlassCard key={head.feeAssignmentId} variant="default" className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {head.feeHead.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {head.feeHead} Fee
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">AY {head.academicYear}</p>
                  </div>
                </div>

                <GlassBadge
                  variant={
                    head.status === 'PAID'
                      ? 'success'
                      : head.status === 'OVERDUE'
                      ? 'danger'
                      : head.status === 'PARTIAL'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="md"
                >
                  {head.status}
                </GlassBadge>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">
                    Paid: ₹{head.paidAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    Total: ₹{head.assignedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      head.status === 'PAID'
                        ? 'bg-emerald-500'
                        : head.status === 'OVERDUE'
                        ? 'bg-rose-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{
                      width: `${Math.min(100, (head.paidAmount / head.assignedAmount) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Due Date & Pay Button */}
              <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Due:{' '}
                    <strong className={head.isOverdue ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}>
                      {new Date(head.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </strong>
                  </span>
                </div>

                {head.pendingAmount > 0 ? (
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenPay(head)}
                  >
                    Pay Due (₹{head.pendingAmount.toLocaleString('en-IN')})
                  </GlassButton>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Cleared
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Payment History & Receipts */}
      <GlassCard variant="default" className="p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-indigo-500" />
            Official Payment History & Downloadable Receipts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download vector PDF receipts for semester exam clearance and verification.
          </p>
        </div>

        <GlassTable
          columns={transactionColumns}
          data={transactions}
          keyExtractor={(item) => item.id}
          emptyMessage="No fee remittance history recorded yet."
        />
      </GlassCard>

      {/* Pay Now Modal (Phase 1 accounts office instructions / Phase 2 ready) */}
      <PayNowModal
        isOpen={payNowOpen}
        onClose={() => setPayNowOpen(false)}
        feeHeadName={selectedPayHead?.feeHead}
        pendingAmount={selectedPayHead ? selectedPayHead.pendingAmount : summary?.totalPending}
        rollNumber={student?.rollNumber}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
};
