import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, AlertCircle, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { reportService } from '../../services/reportService';
import { StudentFeeSummary } from '../../services/studentService';

export const PendingDuesPage: React.FC = () => {
  const [dues, setDues] = useState<StudentFeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const navigate = useNavigate();

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await reportService.getPendingDues({
        search: search || undefined,
        class: filterClass || undefined,
      });

      if (res.success) setDues(res.data);
    } catch (err) {
      console.error('Failed to load pending dues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, [filterClass]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDues();
  };

  const columns: Column<StudentFeeSummary>[] = [
    {
      key: 'rollNumber',
      header: 'Roll Number',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
          {item.rollNumber}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student Name',
      render: (item) => (
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block">{item.name}</span>
          <span className="text-xs text-slate-500">
            {item.class} • Batch {item.batch}
          </span>
        </div>
      ),
    },
    {
      key: 'totalAssigned',
      header: 'Assigned Fee',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          ₹ {item.totalAssigned.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Amount Paid',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          ₹ {item.totalPaid.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalPending',
      header: 'Outstanding Due',
      render: (item) => (
        <div>
          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 block">
            ₹ {item.totalPending.toLocaleString('en-IN')}
          </span>
          <GlassBadge variant={item.hasOverdue ? 'danger' : 'warning'} size="sm">
            {item.hasOverdue ? 'OVERDUE' : 'PENDING'}
          </GlassBadge>
        </div>
      ),
    },
    {
      key: 'nextDueDate',
      header: 'Next Due Date',
      render: (item) => {
        if (!item.nextDueDate) return <span className="text-xs text-slate-400">—</span>;
        const isPast = new Date(item.nextDueDate) < new Date();
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className={isPast ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
              {new Date(item.nextDueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      className: 'text-right',
      render: (item) => (
        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/clerk/collect')}
          leftIcon={<CreditCard className="w-3.5 h-3.5" />}
        >
          Collect Fee
        </GlassButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Outstanding Student Dues
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Live real-time ledger balance computation identifying all students with unremitted semester fees.
        </p>
      </div>

      {/* Filter toolbar */}
      <GlassCard variant="default" className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassInput
            label="Search Student"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name or Roll Number..."
            leftIcon={<Search className="w-4 h-4" />}
          />

          <GlassSelect
            label="Filter By Class"
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

          <div className="flex items-end gap-2">
            <GlassButton type="submit" variant="secondary" className="w-full">
              Filter
            </GlassButton>
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setFilterClass('');
                setTimeout(fetchDues, 50);
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
        data={dues}
        keyExtractor={(item) => item.studentId}
        isLoading={loading}
        emptyMessage="Congratulations! No outstanding student dues pending."
      />
    </div>
  );
};
