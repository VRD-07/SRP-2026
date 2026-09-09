import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  UserPlus,
  Eye,
  Edit2,
  Layers,
  GraduationCap,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import { studentService, StudentListItem, StudentDetail } from '../../services/studentService';
import { feeService, FeeStructure } from '../../services/feeService';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Selected Student & Details
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [availableStructures, setAvailableStructures] = useState<FeeStructure[]>([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);

  // Create Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('B.Tech CSE');
  const [batch, setBatch] = useState('2024-2028');
  const [admissionYear, setAdmissionYear] = useState(2024);
  const [contactNumber, setContactNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAll({
        search: search || undefined,
        class: filterClass || undefined,
      });
      if (res.success) setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [filterClass]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleOpenDetail = async (studentId: string) => {
    try {
      const res = await studentService.getById(studentId);
      if (res.success) {
        setSelectedStudentDetail(res.data);
        setDetailModalOpen(true);
      }
    } catch (err: any) {
      alert(`Failed to load student details: ${err.message}`);
    }
  };

  const handleOpenAssign = async (student: StudentListItem) => {
    try {
      setTargetStudentId(student.id);
      setSelectedStructureIds([]);
      // Fetch structures for this class
      const res = await feeService.getAll({ class: student.class });
      if (res.success) {
        setAvailableStructures(res.data);
        setAssignModalOpen(true);
      }
    } catch (err: any) {
      alert(`Failed to fetch fee structures: ${err.message}`);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || selectedStructureIds.length === 0) return;

    try {
      setSubmitting(true);
      await studentService.assignFeeStructures(targetStudentId, selectedStructureIds);
      setAssignModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      alert(`Failed to assign fee structures: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await studentService.create({
        name,
        email,
        rollNumber,
        class: className,
        batch,
        admissionYear: Number(admissionYear),
        contactNumber,
      });

      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setRollNumber('');
      setContactNumber('');
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<StudentListItem>[] = [
    {
      key: 'rollNumber',
      header: 'Roll Number',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
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
          <span className="text-xs text-slate-500">{item.email}</span>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class & Batch',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
            {item.class}
          </span>
          <span className="text-[11px] text-slate-500">Batch {item.batch}</span>
        </div>
      ),
    },
    {
      key: 'totalAssigned',
      header: 'Assigned',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          ₹ {item.totalAssigned.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Paid',
      render: (item) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          ₹ {item.totalPaid.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'totalPending',
      header: 'Outstanding Dues',
      render: (item) => (
        <div>
          <span
            className={`text-xs font-bold ${
              item.totalPending > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            ₹ {item.totalPending.toLocaleString('en-IN')}
          </span>
          <span className="block mt-0.5">
            <GlassBadge
              variant={
                item.totalPending === 0
                  ? 'success'
                  : item.totalPaid > 0
                  ? 'warning'
                  : 'danger'
              }
              size="sm"
            >
              {item.totalPending === 0 ? 'CLEARED' : item.totalPaid > 0 ? 'PARTIAL' : 'PENDING'}
            </GlassBadge>
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDetail(item.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/60 dark:hover:bg-slate-800"
            title="View Real-Time Dues Breakdown"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenAssign(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-white/60 dark:hover:bg-slate-800"
            title="Assign Fee Heads"
          >
            <Layers className="w-4 h-4" />
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
            Student Fee Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage student records, assign fee packages, and inspect live account balances.
          </p>
        </div>

        <GlassButton
          variant="primary"
          onClick={() => {
            setFormError(null);
            setCreateModalOpen(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Register Student
        </GlassButton>
      </div>

      {/* Filter & Search Bar */}
      <GlassCard variant="default" className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassInput
            label="Search Student"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, Roll No, Email..."
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
                setTimeout(fetchStudents, 50);
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
        data={students}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="No students match the current criteria."
      />

      {/* Student Dues Details Drawer/Modal */}
      <GlassModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedStudentDetail?.student.name || 'Student Account'}
        description={`Roll: ${selectedStudentDetail?.student.rollNumber} • Class: ${selectedStudentDetail?.student.class}`}
        maxWidth="lg"
      >
        {selectedStudentDetail && (
          <div className="space-y-4">
            {/* KPI Summary Bar */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Billed</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  ₹ {selectedStudentDetail.summary.totalAssigned.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                  Total Paid
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹ {selectedStudentDetail.summary.totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                  Outstanding
                </span>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                  ₹ {selectedStudentDetail.summary.totalPending.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Fee Head Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Fee Head Standing (Live Shared Calculation)
              </h4>
              <div className="space-y-2">
                {selectedStudentDetail.summary.heads.map((head) => (
                  <div
                    key={head.feeAssignmentId}
                    className="p-3 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-slate-200/40 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {head.feeHead} Fee ({head.academicYear})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Due:{' '}
                        {new Date(head.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">
                        ₹ {head.paidAmount.toLocaleString('en-IN')} / ₹{' '}
                        {head.assignedAmount.toLocaleString('en-IN')}
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
                        size="sm"
                      >
                        {head.status}
                      </GlassBadge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex justify-end">
              <GlassButton variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Close
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* Assign Fee Structure Modal */}
      <GlassModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Fee Structures"
        description="Select fee heads to associate with this student"
        maxWidth="md"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {availableStructures.map((fs) => (
              <label
                key={fs.id}
                className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-indigo-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={selectedStructureIds.includes(fs.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStructureIds((prev) => [...prev, fs.id]);
                      } else {
                        setSelectedStructureIds((prev) => prev.filter((id) => id !== fs.id));
                      }
                    }}
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      {fs.feeHead} Fee
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Due {new Date(fs.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  ₹ {fs.amount.toLocaleString('en-IN')}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              isLoading={submitting}
              disabled={selectedStructureIds.length === 0}
            >
              Assign Selected ({selectedStructureIds.length})
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Register Student Modal */}
      <GlassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Register New Student"
        description="Creates student account, student record, and automatically links class fee structures."
        maxWidth="md"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Student Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Mehta"
            />

            <GlassInput
              label="Roll Number"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 24CSE0105"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Institutional Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aarav@college.edu"
            />

            <GlassInput
              label="Contact Number"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+91 98765 00000"
            />
          </div>

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
              placeholder="2024-2028"
            />
          </div>

          <div className="pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary" isLoading={submitting}>
              Register Student
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
