import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  CreditCard,
  User,
  AlertCircle,
  FileCheck,
  Receipt,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { studentService, StudentListItem, StudentDetail, FeeHeadBreakdown } from '../../services/studentService';
import { transactionService, Transaction } from '../../services/transactionService';
import { ReceiptModal } from '../../components/shared/ReceiptModal';

export const CollectFeesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // Payment Form Fields
  const [selectedHead, setSelectedHead] = useState<FeeHeadBreakdown | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CHEQUE' | 'DD' | 'ONLINE_PLACEHOLDER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success Modal
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Live search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await studentService.getAll({ search: searchQuery.trim() });
        if (res.success) setSearchResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectStudent = async (studentId: string) => {
    try {
      setLoadingStudent(true);
      setFormError(null);
      const res = await studentService.getById(studentId);
      if (res.success) {
        setSelectedStudent(res.data);
        // Pre-select first head with pending dues if any
        const pendingHead = res.data.summary.heads.find((h) => h.pendingAmount > 0);
        if (pendingHead) {
          setSelectedHead(pendingHead);
          setAmount(String(pendingHead.pendingAmount));
        } else if (res.data.summary.heads.length > 0) {
          setSelectedHead(res.data.summary.heads[0]);
          setAmount('');
        }
      }
    } catch (err: any) {
      alert(`Failed to load student: ${err.message}`);
    } finally {
      setLoadingStudent(false);
    }
  };

  const handleHeadChange = (headId: string) => {
    if (!selectedStudent) return;
    const head = selectedStudent.summary.heads.find((h) => h.feeAssignmentId === headId);
    if (head) {
      setSelectedHead(head);
      setAmount(head.pendingAmount > 0 ? String(head.pendingAmount) : '');
      setFormError(null);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedHead) return;

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setFormError('Payment amount must be a positive number');
      return;
    }

    if (payAmount > selectedHead.pendingAmount && !allowOverride) {
      setFormError(
        `Payment (₹${payAmount.toLocaleString()}) exceeds due amount (₹${selectedHead.pendingAmount.toLocaleString()}). Enable Overpayment Override to proceed.`
      );
      return;
    }

    if (!referenceNumber.trim()) {
      setFormError('Please provide a reference number (Cash Voucher #, Cheque #, or DD #).');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await transactionService.recordPayment({
        studentId: selectedStudent.student.id,
        feeAssignmentId: selectedHead.feeAssignmentId,
        amount: payAmount,
        paymentMode,
        referenceNumber: referenceNumber.trim(),
        allowOverpaymentOverride: allowOverride,
      });

      if (res.success && res.data) {
        // Celebratory confetti animation
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setCreatedTx(res.data);
        setReceiptModalOpen(true);

        // Refresh student details to update balance
        const refresh = await studentService.getById(selectedStudent.student.id);
        if (refresh.success) {
          setSelectedStudent(refresh.data);
          const updatedHead = refresh.data.summary.heads.find(
            (h) => h.feeAssignmentId === selectedHead.feeAssignmentId
          );
          if (updatedHead) {
            setSelectedHead(updatedHead);
            setAmount(updatedHead.pendingAmount > 0 ? String(updatedHead.pendingAmount) : '');
          }
        }

        setReferenceNumber('');
        setAllowOverride(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Payment recording failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Collect Fee & Issue Receipt
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Search student by roll number or name, review live fee breakdown, record deposit, and generate verified PDF voucher.
        </p>
      </div>

      {/* Student Live Search Bar */}
      <GlassCard variant="default" className="p-4 space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Find Student (Live Search by Roll No. or Name)
        </label>
        <div className="relative">
          <GlassInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type student name (e.g. Aarav) or roll number (e.g. 24CSE0101)..."
            leftIcon={<Search className="w-4 h-4" />}
          />

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-2xl glass-dropdown divide-y divide-slate-200/50 dark:divide-white/10 max-h-64 overflow-y-auto shadow-2xl">
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    handleSelectStudent(s.id);
                    setSearchResults([]);
                    setSearchQuery(`${s.name} (${s.rollNumber})`);
                  }}
                  className="p-3.5 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {s.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {s.rollNumber} • {s.class}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
                        s.totalPending > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      Dues: ₹ {s.totalPending.toLocaleString('en-IN')}
                    </span>
                    <GlassBadge
                      variant={s.totalPending === 0 ? 'success' : 'warning'}
                      size="sm"
                    >
                      {s.totalPending === 0 ? 'CLEARED' : 'PENDING'}
                    </GlassBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* When student is loaded */}
      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Left Column: Student Details & Fee Breakdown (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Profile Snapshot */}
            <GlassCard variant="default" className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
                    {selectedStudent.student.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedStudent.student.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Roll: {selectedStudent.student.rollNumber} • {selectedStudent.student.class} (Batch {selectedStudent.student.batch})
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Student Due Balance
                  </span>
                  <span
                    className={`text-xl font-extrabold ${
                      selectedStudent.summary.totalPending > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    ₹ {selectedStudent.summary.totalPending.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Dues breakdown pills */}
              <div className="grid grid-cols-3 gap-3 pt-3 text-center text-xs">
                <div>
                  <span className="text-slate-500 block">Total Billed</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹ {selectedStudent.summary.totalAssigned.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 block">Total Remitted</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹ {selectedStudent.summary.totalPaid.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reversed Amount</span>
                  <span className="font-bold text-rose-500">
                    ₹ {selectedStudent.summary.totalReversals.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </GlassCard>

            {/* Fee Heads Selection List */}
            <GlassCard variant="default" className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Fee Head to Deposit
                </h4>
                <span className="text-[11px] text-slate-500">
                  Click a fee head to load deposit amount
                </span>
              </div>

              <div className="space-y-2">
                {selectedStudent.summary.heads.map((head) => {
                  const isSelected = selectedHead?.feeAssignmentId === head.feeAssignmentId;
                  return (
                    <div
                      key={head.feeAssignmentId}
                      onClick={() => handleHeadChange(head.feeAssignmentId)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-500/15 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {head.feeHead.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {head.feeHead} Fee
                            </span>
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
                              size="sm"
                            >
                              {head.status}
                            </GlassBadge>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Due:{' '}
                            {new Date(head.dueDate).toLocaleDateString('en-IN', {
                              dateStyle: 'medium',
                            })}{' '}
                            • Total Assigned: ₹{head.assignedAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Pending Due:</span>
                        <span
                          className={`text-sm font-extrabold ${
                            head.pendingAmount > 0
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ₹ {head.pendingAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Payment Recording Form (1 col) */}
          <div className="space-y-6">
            <GlassCard variant="elevated" className="p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  Deposit Payment Form
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enforces strict server-side transaction consistency and generates official receipt.
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {selectedHead && (
                <form onSubmit={handleRecordPayment} className="space-y-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                    <span className="text-slate-500 block">Selected Fee Head:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                      {selectedHead.feeHead} Fee (Due: ₹{selectedHead.pendingAmount.toLocaleString('en-IN')})
                    </span>
                  </div>

                  <GlassInput
                    label="Amount to Remit (INR) *"
                    type="number"
                    min={1}
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter deposit amount"
                  />

                  <GlassSelect
                    label="Payment Mode *"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    options={[
                      { value: 'CASH', label: 'Cash Remittance' },
                      { value: 'CHEQUE', label: 'Bank Cheque' },
                      { value: 'DD', label: 'Demand Draft (DD)' },
                      { value: 'ONLINE_PLACEHOLDER', label: 'POS / Online Terminal' },
                    ]}
                  />

                  <GlassInput
                    label="Reference / Instrument No. *"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. CASH-VCH-8819 or CHQ-091244"
                    helperText="Required for official receipt & audit reconciliation"
                  />

                  {Number(amount) > selectedHead.pendingAmount && (
                    <label className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowOverride}
                        onChange={(e) => setAllowOverride(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                        Confirm Overpayment Override (Amount exceeds current outstanding)
                      </span>
                    </label>
                  )}

                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full mt-2"
                    isLoading={submitting}
                    disabled={!selectedHead || !amount || Number(amount) <= 0}
                    leftIcon={<FileCheck className="w-4 h-4" />}
                  >
                    Confirm & Issue Receipt
                  </GlassButton>
                </form>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        transaction={createdTx}
      />
    </div>
  );
};
