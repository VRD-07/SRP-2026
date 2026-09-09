import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Users,
  CreditCard,
  FileBarChart,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { StatCard } from '../../components/shared/StatCard';
import { reportService, OverviewReportData } from '../../services/reportService';
import { transactionService, Transaction } from '../../services/transactionService';
import { ReceiptModal } from '../../components/shared/ReceiptModal';
import { ReversalModal } from '../../components/shared/ReversalModal';

export const AdminDashboard: React.FC = () => {
  const [report, setReport] = useState<OverviewReportData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [overviewRes, txRes] = await Promise.all([
        reportService.getOverview(),
        transactionService.getAll(),
      ]);

      if (overviewRes.success) setReport(overviewRes.data);
      if (txRes.success) setRecentTransactions(txRes.data.slice(0, 6));
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const kpis = report?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Institutional Finance Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time revenue metrics, fee heads collection status, and bursar ledger audit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/reports')}
            leftIcon={<FileBarChart className="w-4 h-4" />}
          >
            Detailed Reports
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/fee-structures')}
            leftIcon={<Layers className="w-4 h-4" />}
          >
            Manage Fees
          </GlassButton>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Assigned Fees"
          value={`₹ ${(kpis?.totalAssigned || 0).toLocaleString('en-IN')}`}
          subtitle={`${kpis?.totalStudents || 0} enrolled students`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="indigo"
        />

        <StatCard
          title="Total Revenue Collected"
          value={`₹ ${(kpis?.totalCollected || 0).toLocaleString('en-IN')}`}
          subtitle={`${kpis?.collectionRatePercentage || 0}% overall collection rate`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="emerald"
          trend={`+${kpis?.collectionRatePercentage || 0}%`}
        />

        <StatCard
          title="Outstanding Pending Dues"
          value={`₹ ${(kpis?.totalPending || 0).toLocaleString('en-IN')}`}
          subtitle={`${kpis?.studentsWithDues || 0} students with dues`}
          icon={<AlertCircle className="w-5 h-5" />}
          variant="amber"
        />

        <StatCard
          title="Audited Reversals"
          value={`₹ ${(kpis?.totalReversedAmount || 0).toLocaleString('en-IN')}`}
          subtitle="Compensating entries"
          icon={<RotateCcw className="w-5 h-5" />}
          variant="rose"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Trends Chart (2 cols) */}
        <GlassCard variant="default" className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Revenue Collection Timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily collection progression across all programs
              </p>
            </div>
            <GlassBadge variant="success">Live Synced</GlassBadge>
          </div>

          <div className="h-64 w-full pt-2">
            {report?.timelineTrends && report.timelineTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.timelineTrends}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recent timeline data available
              </div>
            )}
          </div>
        </GlassCard>

        {/* Fee Head Breakdown Donut (1 col) */}
        <GlassCard variant="default" className="p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Fee Head Split</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Revenue collected by fee type</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {report?.feeHeadDistribution && report.feeHeadDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.feeHeadDistribution}
                    dataKey="collected"
                    nameKey="head"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {report.feeHeadDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No data available</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Class Distribution Bar Chart */}
      <GlassCard variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Program-wise Assigned vs Collected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparative dues recovery across academic branches
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          {report?.classDistribution && report.classDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.classDistribution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => `₹ ${Number(val).toLocaleString('en-IN')}`}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="assigned" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Assigned" />
                <Bar dataKey="collected" fill="#6366f1" radius={[4, 4, 0, 0]} name="Collected" />
                <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No program data available
            </div>
          )}
        </div>
      </GlassCard>

      {/* Recent Transactions List */}
      <GlassCard variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Transactions & Reversals
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live bursar entries recorded across all collection desks
            </p>
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/reports')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All Ledger
          </GlassButton>
        </div>

        <div className="divide-y divide-slate-200/50 dark:divide-white/5">
          {recentTransactions.map((tx) => {
            const isReversed = tx.status === 'REVERSED';
            return (
              <div
                key={tx.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/40 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isReversed
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {isReversed ? <RotateCcw className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {tx.student.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        ({tx.student.rollNumber})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tx.feeAssignment.feeStructure.feeHead} • Ref: {tx.referenceNumber} • Receipt: #{tx.receiptNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        isReversed ? 'text-rose-600 dark:text-rose-400 line-through' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      ₹ {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <GlassBadge variant={isReversed ? 'danger' : 'success'} size="sm">
                      {isReversed ? 'REVERSED' : 'SUCCESS'}
                    </GlassBadge>

                    <button
                      onClick={() => {
                        setSelectedTx(tx);
                        setReceiptModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/60 dark:hover:bg-slate-800"
                      title="View Voucher"
                    >
                      <FileBarChart className="w-4 h-4" />
                    </button>

                    {!isReversed && !tx.reversedBy && (
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setReversalModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/60 dark:hover:bg-slate-800"
                        title="Initiate Reversal"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

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
        onSuccess={() => fetchData()}
      />
    </div>
  );
};
