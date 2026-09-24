import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, History, Clock, Search, ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatCard } from '../../components/shared/StatCard';
import { transactionService, Transaction } from '../../services/transactionService';
import { reportService } from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { ReceiptModal } from '../../components/shared/ReceiptModal';

export const ClerkDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchClerkOverview = async () => {
    try {
      setLoading(true);
      const [txRes, duesRes] = await Promise.all([
        transactionService.getAll({ myRecordsOnly: true }),
        reportService.getPendingDues(),
      ]);

      if (txRes.success) setMyTransactions(txRes.data);
      if (duesRes.success) setPendingCount(duesRes.data.length);
    } catch (err) {
      console.error('Failed to load cashier overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClerkOverview();
  }, []);

  const totalCollectedToday = myTransactions
    .filter((t) => {
      const txDate = new Date(t.createdAt).toDateString();
      const today = new Date().toDateString();
      return txDate === today && t.status === 'SUCCESS' && !t.reversedBy;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-charcoal  tracking-tight">
            Fee Collection Desk
          </h1>
          <p className="text-xs sm:text-sm text-muted  mt-1">
            Cashier workstation for {user?.name}. Process fee deposits and generate official receipts.
          </p>
        </div>

        <GlassButton
          variant="primary"
          onClick={() => navigate('/clerk/collect')}
          leftIcon={<CreditCard className="w-4 h-4" />}
          size="lg"
        >
          Collect Fee Now
        </GlassButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Today's Desk Collections"
          value={`₹ ${totalCollectedToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Net verified deposits today"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="emerald"
        />

        <StatCard
          title="My Total Transactions"
          value={myTransactions.length}
          subtitle="Vouchers recorded by this cashier"
          icon={<History className="w-5 h-5" />}
          variant="cyan"
        />

        <StatCard
          title="Students with Outstanding Dues"
          value={pendingCount}
          subtitle="Pending semester clearance"
          icon={<Clock className="w-5 h-5" />}
          variant="amber"
        />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard
          variant="default"
          hoverEffect
          onClick={() => navigate('/clerk/collect')}
          className="p-5 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-olive-500/15 text-olive-700  flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-charcoal ">Collect Student Fees</h4>
              <p className="text-xs text-muted">Live search & voucher issue</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
        </GlassCard>

        <GlassCard
          variant="default"
          hoverEffect
          onClick={() => navigate('/clerk/history')}
          className="p-5 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-spruce/15 text-spruce-700  flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-charcoal ">My Payment Ledger</h4>
              <p className="text-xs text-muted">Search & print past receipts</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
        </GlassCard>

        <GlassCard
          variant="default"
          hoverEffect
          onClick={() => navigate('/clerk/pending')}
          className="p-5 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gold/15 text-gold-700  flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-charcoal ">Pending Dues List</h4>
              <p className="text-xs text-muted">Live outstanding balances</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
        </GlassCard>
      </div>

      {/* Recent Collections by this Clerk */}
      <GlassCard variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal ">
              Recent Deposits Recorded by You
            </h3>
            <p className="text-xs text-muted">Latest receipts issued at your collection station</p>
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clerk/history')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Full Ledger
          </GlassButton>
        </div>

        <div className="divide-y divide-olive-500/10 ">
          {myTransactions.slice(0, 5).map((tx) => (
            <div
              key={tx.id}
              className="py-3 flex items-center justify-between hover:bg-white/60  p-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-olive-500/15 text-olive-700  flex items-center justify-center font-bold text-xs font-mono">
                  RCP
                </div>
                <div>
                  <span className="font-bold text-xs text-charcoal  block">
                    {tx.student.name} ({tx.student.rollNumber})
                  </span>
                  <span className="text-[11px] text-muted">
                    {tx.feeAssignment.feeStructure.feeHead} • {tx.paymentMode} (Ref: {tx.referenceNumber})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-bold text-sm text-charcoal  block">
                    ₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted">Receipt #{tx.receiptNumber}</span>
                </div>

                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedTx(tx);
                    setReceiptOpen(true);
                  }}
                >
                  Receipt
                </GlassButton>
              </div>
            </div>
          ))}

          {myTransactions.length === 0 && (
            <div className="py-8 text-center text-xs text-muted">
              No transactions recorded yet today. Click "Collect Fee Now" to process your first payment.
            </div>
          )}
        </div>
      </GlassCard>

      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        transaction={selectedTx}
      />
    </div>
  );
};
