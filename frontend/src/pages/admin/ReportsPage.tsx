import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Filter, Search, RotateCcw, Eye, FileText } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { reportService, OverviewReportData } from '../../services/reportService';
import { transactionService, Transaction } from '../../services/transactionService';
import { ReceiptModal } from '../../components/shared/ReceiptModal';
import { ReversalModal } from '../../components/shared/ReversalModal';

export const ReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [report, setReport] = useState<OverviewReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'SUCCESS' | 'REVERSED'>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchReceipt, setSearchReceipt] = useState('');

  // Modals
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);

  const fetchReportsAndLedger = async () => {
    try {
      setLoading(true);
      const [overviewRes, txRes] = await Promise.all([
        reportService.getOverview({
          class: filterClass || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        transactionService.getAll({
          receiptNumber: searchReceipt || undefined,
          status: (filterStatus as any) || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      if (overviewRes.success) setReport(overviewRes.data);
      if (txRes.success) {
        // filter by class if specified
        let list = txRes.data;
        if (filterClass) {
          list = list.filter((t) => t.student.class === filterClass);
        }
        setTransactions(list);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndLedger();
  }, [filterClass, filterStatus, startDate, endDate]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await reportService.exportCsv({
        class: filterClass || undefined,
        status: filterStatus || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (err: any) {
      alert(`CSV Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Transaction>[] = [
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
      key: 'student',
      header: 'Student & Roll',
      render: (item) => (
        <div>
          <span className="font-bold text-xs text-slate-900 dark:text-white block">
            {item.student.name}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {item.student.rollNumber} • {item.student.class}
          </span>
        </div>
      ),
    },
    {
      key: 'feeHead',
      header: 'Fee Head',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
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
      header: 'Payment Mode',
      render: (item) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
            {item.paymentMode}
          </span>
          <span className="text-[10px] text-slate-500 truncate max-w-[100px] block">
            Ref: {item.referenceNumber}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Recorded Date',
      render: (item) => (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(item.createdAt).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </div>
      ),
    },
    {
      key: 'clerk',
      header: 'Recorded By',
      render: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {item.recordedByClerk.name}
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
              title="Reverse Transaction"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Reports & Ledger Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time totals, filtered collections, transaction logs, and official CSV exports.
          </p>
        </div>

        <GlassButton
          variant="primary"
          onClick={handleExportCsv}
          isLoading={exporting}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV Report
        </GlassButton>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard variant="default" className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Billed
          </span>
          <span className="text-lg font-extrabold text-slate-900 dark:text-white">
            ₹ {(report?.kpis.totalAssigned || 0).toLocaleString('en-IN')}
          </span>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Net Collected
          </span>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
            ₹ {(report?.kpis.totalCollected || 0).toLocaleString('en-IN')}
          </span>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Pending Dues
          </span>
          <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
            ₹ {(report?.kpis.totalPending || 0).toLocaleString('en-IN')}
          </span>
        </GlassCard>

        <GlassCard variant="default" className="p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
            Reversals
          </span>
          <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
            ₹ {(report?.kpis.totalReversedAmount || 0).toLocaleString('en-IN')}
          </span>
        </GlassCard>
      </div>

      {/* Filter Bar */}
      <GlassCard variant="default" className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <GlassSelect
            label="Class / Program"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            options={[
              { value: '', label: 'All Classes' },
              { value: 'B.Tech CSE', label: 'B.Tech CSE' },
              { value: 'B.Tech IT', label: 'B.Tech IT' },
              { value: 'BBA', label: 'BBA' },
              { value: 'MBA', label: 'MBA' },
            ]}
          />

          <GlassSelect
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'SUCCESS', label: 'Successful Payments' },
              { value: 'REVERSED', label: 'Reversed Entries' },
            ]}
          />

          <GlassInput
            label="From Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <GlassInput
            label="To Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="flex items-end gap-2">
            <GlassButton
              variant="secondary"
              className="w-full"
              onClick={() => {
                setFilterClass('');
                setFilterStatus('');
                setStartDate('');
                setEndDate('');
                setSearchReceipt('');
              }}
            >
              Reset
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Transactions Ledger Table */}
      <GlassTable
        columns={columns}
        data={transactions}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No transactions match the selected filters."
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
        onSuccess={() => fetchReportsAndLedger()}
      />
    </div>
  );
};
