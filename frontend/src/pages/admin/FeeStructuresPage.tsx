import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Layers, Search, Filter } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { feeService, FeeStructure } from '../../services/feeService';

export const FeeStructuresPage: React.FC = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [className, setClassName] = useState('B.Tech CSE');
  const [batch, setBatch] = useState('2024-2028');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [feeHead, setFeeHead] = useState<FeeStructure['feeHead']>('Tuition');
  const [amount, setAmount] = useState<number>(50000);
  const [dueDate, setDueDate] = useState<string>('2026-10-31');

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const res = await feeService.getAll({
        class: filterClass || undefined,
        academicYear: filterYear || undefined,
      });
      if (res.success) setStructures(res.data);
    } catch (err) {
      console.error('Failed to load fee structures:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [filterClass, filterYear]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setClassName('B.Tech CSE');
    setBatch('2024-2028');
    setAcademicYear('2026-2027');
    setFeeHead('Tuition');
    setAmount(50000);
    setDueDate('2026-10-31');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: FeeStructure) => {
    setEditingId(item.id);
    setClassName(item.class);
    setBatch(item.batch);
    setAcademicYear(item.academicYear);
    setFeeHead(item.feeHead);
    setAmount(item.amount);
    setDueDate(item.dueDate.split('T')[0]);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingId) {
        await feeService.update(editingId, {
          class: className,
          batch,
          academicYear,
          feeHead,
          amount: Number(amount),
          dueDate: new Date(dueDate).toISOString(),
        });
      } else {
        await feeService.create({
          class: className,
          batch,
          academicYear,
          feeHead,
          amount: Number(amount),
          dueDate: new Date(dueDate).toISOString(),
        });
      }

      setModalOpen(false);
      fetchStructures();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: FeeStructure) => {
    if (
      !confirm(
        `Are you sure you want to delete ${item.feeHead} Fee for ${item.class} (${item.batch})?`
      )
    ) {
      return;
    }

    try {
      await feeService.delete(item.id);
      fetchStructures();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const columns: Column<FeeStructure>[] = [
    {
      key: 'feeHead',
      header: 'Fee Head',
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            {item.feeHead.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 dark:text-white block">
              {item.feeHead} Fee
            </span>
            <span className="text-[11px] text-slate-500">AY {item.academicYear}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Program & Batch',
      render: (item) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.class}</span>
          <span className="text-xs text-slate-500">Batch {item.batch}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item) => (
        <span className="font-bold text-slate-900 dark:text-white">
          ₹ {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item) => {
        const isPast = new Date(item.dueDate) < new Date();
        return (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className={isPast ? 'text-rose-500 font-semibold text-xs' : 'text-slate-700 dark:text-slate-300 text-xs'}>
              {new Date(item.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'assignments',
      header: 'Assigned To',
      render: (item) => (
        <GlassBadge variant="purple" size="sm">
          {item._count?.feeAssignments ?? 0} Students
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
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
            title="Edit Structure"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
            title="Delete Structure"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
            Fee Structure Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure fee heads, rate charts, and payment due schedules across academic cohorts.
          </p>
        </div>

        <GlassButton
          variant="primary"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Fee Head
        </GlassButton>
      </div>

      {/* Filter Toolbar */}
      <GlassCard variant="default" className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassSelect
            label="Filter By Program / Class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            options={[
              { value: '', label: 'All Programs' },
              { value: 'B.Tech CSE', label: 'B.Tech CSE' },
              { value: 'B.Tech IT', label: 'B.Tech IT' },
              { value: 'BBA', label: 'BBA' },
              { value: 'MBA', label: 'MBA' },
            ]}
          />

          <GlassSelect
            label="Filter By Academic Year"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            options={[
              { value: '', label: 'All Academic Years' },
              { value: '2026-2027', label: '2026-2027' },
              { value: '2025-2026', label: '2025-2026' },
              { value: '2024-2025', label: '2024-2025' },
            ]}
          />

          <div className="flex items-end">
            <GlassButton
              variant="secondary"
              className="w-full"
              onClick={() => {
                setFilterClass('');
                setFilterYear('');
              }}
            >
              Reset Filters
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassTable
        columns={columns}
        data={structures}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No fee structures match the current criteria."
      />

      {/* Create / Edit Modal */}
      <GlassModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Fee Head Structure' : 'Create New Fee Head Structure'}
        description="Specify program, academic year, billing head, rate and due date."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <GlassSelect
              label="Class / Program"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              options={[
                { value: 'B.Tech CSE', label: 'B.Tech CSE' },
                { value: 'B.Tech IT', label: 'B.Tech IT' },
                { value: 'BBA', label: 'BBA' },
                { value: 'MBA', label: 'MBA' },
              ]}
            />

            <GlassInput
              label="Batch"
              required
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 2024-2028"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassSelect
              label="Academic Year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              options={[
                { value: '2026-2027', label: '2026-2027' },
                { value: '2025-2026', label: '2025-2026' },
                { value: '2024-2025', label: '2024-2025' },
              ]}
            />

            <GlassSelect
              label="Fee Head"
              value={feeHead}
              onChange={(e) => setFeeHead(e.target.value as any)}
              options={[
                { value: 'Tuition', label: 'Tuition Fee' },
                { value: 'Hostel', label: 'Hostel / Accommodation' },
                { value: 'Transport', label: 'Transport / Bus Fee' },
                { value: 'Exam', label: 'Examination Fee' },
                { value: 'LateFee', label: 'Late Fee / Surcharge' },
                { value: 'Other', label: 'Other Miscellaneous' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Amount (INR)"
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 75000"
            />

            <GlassInput
              label="Due Date"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={submitting}>
              {editingId ? 'Update Structure' : 'Create Structure'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
