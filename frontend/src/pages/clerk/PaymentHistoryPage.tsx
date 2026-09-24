import React, { useState, useEffect } from 'react';
import { Search, Eye, RotateCcw, Download, Calendar } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { transactionService, Transaction } from '../../services/transactionService';
import { ReceiptModal } from '../../components/shared/ReceiptModal';
import { ReversalModal } from '../../components/shared/ReversalModal';

export const PaymentHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchReceipt, setSearchReceipt] = useState('');
  const [searchRoll, setSearchRoll] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'SUCCESS' | 'REVERSED'>('');

  // Modals
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await transactionService.getAll({
        myRecordsOnly: true,
        receiptNumber: searchReceipt || undefined,
        rollNumber: searchRoll || undefined,
        status: (filterStatus as any) || undefined,
      });

      if (res.success) setTransactions(res.data);
    } catch (err) {
      console.error('Failed to load cashier history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt Voucher',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-olive-800 ">
          {item.receiptNumber}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student & Roll No.',
      render: (item) => (
        <div>
          <span className="font-bold text-xs text-charcoal  block">
            {item.student.name}
          </span>
          <span className="text-[11px] text-muted font-mono">
            {item.student.rollNumber} • {item.student.class}
          </span>
        </div>
      ),
    },
    {
      key: 'feeHead',
      header: 'Fee Head',
      render: (item) => (
        <span className="text-xs font-semibold text-charcoal ">
          {item.feeAssignment.feeStructure.feeHead} Fee
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item) => {
        const isReversed = item.status === 'REVERSED';
        return (
          <span
            className={`font-bold text-xs ${
              isReversed ? 'text-terracotta  line-through' : 'text-charcoal '
            }`}
          >
            ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'mode',
      header: 'Mode & Ref',
      render: (item) => (
        <div>
          <span className="font-semibold text-xs text-charcoal  block">
            {item.paymentMode}
          </span>
          <span className="text-[10px] text-muted truncate max-w-[100px] block">
            Ref: {item.referenceNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Recorded On',
      render: (item) => (
        <span className="text-xs text-muted ">
          {new Date(item.createdAt).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
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
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedTx(item);
              setReceiptModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-muted hover:text-olive-800 hover:bg-white/80  transition-colors"
            title="View & Download PDF Receipt"
          >
            <Eye className="w-4 h-4" />
          </button>

          {item.status === 'SUCCESS' && !item.reversedBy && (
            <button
              onClick={() => {
                setSelectedTx(item);
                setReversalModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-muted hover:text-terracotta hover:bg-white/80  transition-colors"
              title="Initiate Reversal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-charcoal  tracking-tight">
          Desk Payment History & Audit
        </h1>
        <p className="text-xs sm:text-sm text-muted  mt-1">
          Historical record of fee deposits collected by your cashier workstation. Download official vouchers or initiate reversals.
        </p>
      </div>

      {/* Filter toolbar */}
      <GlassCard variant="default" className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <GlassInput
            label="Search Receipt #"
            value={searchReceipt}
            onChange={(e) => setSearchReceipt(e.target.value)}
            placeholder="e.g. RCP-202609-00001"
            leftIcon={<Search className="w-4 h-4" />}
          />

          <GlassInput
            label="Search Roll Number"
            value={searchRoll}
            onChange={(e) => setSearchRoll(e.target.value)}
            placeholder="e.g. 24CSE0101"
            leftIcon={<Search className="w-4 h-4" />}
          />

          <GlassSelect
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Successful Deposits' },
              { value: 'REVERSED', label: 'Reversals' },
            ]}
          />

          <div className="flex items-end gap-2">
            <GlassButton type="submit" variant="secondary" className="w-full">
              Search
            </GlassButton>
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchReceipt('');
                setSearchRoll('');
                setFilterStatus('');
                setTimeout(fetchTransactions, 50);
              }}
            >
              Reset
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {/* Table */}
      <GlassTable
        columns={columns}
        data={transactions}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No payments recorded under the selected criteria."
      />

      {/* Modals */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        transaction={selectedTx}
      />

      <ReversalModal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        transaction={selectedTx}
        onSuccess={() => fetchTransactions()}
      />
    </div>
  );
};
