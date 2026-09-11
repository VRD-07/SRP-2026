import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  UserSquare2,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  AlertCircle,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import {
  teacherService,
  TeacherListItem,
  ClassSectionAssignment,
} from '../../services/teacherService';

const AVAILABLE_CLASS_SECTIONS: ClassSectionAssignment[] = [
  { class: 'B.Tech CSE', section: 'A' },
  { class: 'B.Tech CSE', section: 'B' },
  { class: 'B.Tech IT', section: 'A' },
  { class: 'BBA', section: 'A' },
  { class: 'MBA', section: 'A' },
];

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherListItem | null>(null);
  const [targetTeacher, setTargetTeacher] = useState<TeacherListItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<ClassSectionAssignment[]>([]);
  const [password, setPassword] = useState('Teacher@123');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await teacherService.getAll({ search: search || undefined });
      if (res.success) setTeachers(res.data);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeachers();
  };

  const handleOpenCreate = () => {
    setFormError(null);
    const rand = Math.floor(Math.random() * 900 + 100);
    setName('');
    setEmail('');
    setEmployeeId(`TCH-${rand}`);
    setSubjectsInput('');
    setAssignedClasses([{ class: 'B.Tech CSE', section: 'A' }]);
    setPassword('Teacher@123');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (t: TeacherListItem) => {
    setFormError(null);
    setEditingTeacher(t);
    setName(t.name);
    setEmail(t.email);
    setEmployeeId(t.employeeId);
    setSubjectsInput(t.subjectsTaught.join(', '));
    setAssignedClasses(t.classesAssigned || []);
    setEditModalOpen(true);
  };

  const handleOpenReset = (t: TeacherListItem) => {
    setTargetTeacher(t);
    setNewPassword('');
    setResetModalOpen(true);
  };

  const toggleClassAssignment = (item: ClassSectionAssignment) => {
    const exists = assignedClasses.some(
      (a) => a.class === item.class && a.section === item.section
    );
    if (exists) {
      setAssignedClasses(
        assignedClasses.filter(
          (a) => !(a.class === item.class && a.section === item.section)
        )
      );
    } else {
      setAssignedClasses([...assignedClasses, item]);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const subjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (subjects.length === 0) {
      setFormError('Please enter at least one subject');
      return;
    }

    if (assignedClasses.length === 0) {
      setFormError('Please assign at least one class and section');
      return;
    }

    try {
      setSubmitting(true);
      await teacherService.create({
        name,
        email,
        employeeId,
        subjectsTaught: subjects,
        classesAssigned: assignedClasses,
        password,
      });

      setCreateModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setFormError(null);

    const subjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (subjects.length === 0) {
      setFormError('Please enter at least one subject');
      return;
    }

    if (assignedClasses.length === 0) {
      setFormError('Please assign at least one class and section');
      return;
    }

    try {
      setSubmitting(true);
      await teacherService.update(editingTeacher.id, {
        name,
        email,
        employeeId,
        subjectsTaught: subjects,
        classesAssigned: assignedClasses,
      });

      setEditModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (t: TeacherListItem) => {
    try {
      await teacherService.updateStatus(t.id, !t.isActive);
      fetchTeachers();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacher || !newPassword) return;

    try {
      setSubmitting(true);
      await teacherService.resetPassword(targetTeacher.id, newPassword);
      setResetModalOpen(false);
      alert(`Password successfully reset for ${targetTeacher.name}`);
    } catch (err: any) {
      alert(`Password reset failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<TeacherListItem>[] = [
    {
      key: 'employeeId',
      header: 'Employee ID',
      render: (item) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
          {item.employeeId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Faculty Name',
      render: (item) => (
        <div>
          <span className="font-bold text-sm text-slate-900 dark:text-white block">
            {item.name}
          </span>
          <span className="text-xs text-slate-500">{item.email}</span>
        </div>
      ),
    },
    {
      key: 'classesAssigned',
      header: 'Assigned Classes & Sections',
      render: (item) => (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {item.classesAssigned && item.classesAssigned.length > 0 ? (
            item.classesAssigned.map((ca, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
              >
                {ca.class} ({ca.section})
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No classes assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'subjectsTaught',
      header: 'Subjects Taught',
      render: (item) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {item.subjectsTaught.map((sub, idx) => (
            <span
              key={idx}
              className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-white/5"
            >
              {sub}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item) => (
        <GlassBadge variant={item.isActive ? 'success' : 'danger'} size="sm">
          {item.isActive ? 'ACTIVE' : 'DEACTIVATED'}
        </GlassBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white/60 dark:hover:bg-slate-800"
            title="Edit Teacher & Class Assignments"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenReset(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-white/60 dark:hover:bg-slate-800"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(item)}
            className={`p-1.5 rounded-lg ${
              item.isActive
                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
            title={item.isActive ? 'Deactivate Teacher' : 'Activate Teacher'}
          >
            {item.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Faculty & Teacher Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage teacher accounts, assign specific class & section combinations, and enforce RBAC permissions
          </p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Teacher
        </GlassButton>
      </div>

      {/* Search Bar */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="flex-1">
            <GlassInput
              placeholder="Search faculty by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <GlassButton variant="secondary" type="submit">
            Search
          </GlassButton>
        </form>
      </GlassCard>

      {/* Table */}
      <GlassTable
        keyExtractor={(row) => row.id}
        columns={columns}
        data={teachers}
        isLoading={loading}
        emptyMessage="No faculty or teachers found."
      />

      {/* Create Teacher Modal */}
      <GlassModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Teacher Account"
        description="Faculty will log in with this email and mark attendance only for assigned classes."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sunita Sharma"
            />
            <GlassInput
              label="Employee ID (Unique)"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. TCH-105"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Institutional Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sunita.sharma@college.edu"
            />
            <GlassInput
              label="Initial Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <GlassInput
            label="Subjects Taught (comma-separated)"
            required
            value={subjectsInput}
            onChange={(e) => setSubjectsInput(e.target.value)}
            placeholder="e.g. Operating Systems, Computer Networks"
          />

          {/* Class & Section Assignment Matrix */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Assign Classes & Sections (Strict Attendance Boundary):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_CLASS_SECTIONS.map((item, idx) => {
                const isSelected = assignedClasses.some(
                  (a) => a.class === item.class && a.section === item.section
                );
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleClassAssignment(item)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xs">
                      {item.class} <span className="text-[11px] opacity-75">Sec {item.section}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/40 dark:border-white/10">
            <GlassButton variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit" isLoading={submitting}>
              Create Teacher Account
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Edit Teacher Modal */}
      <GlassModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Teacher & Class Assignments"
        description="Update faculty profile and re-assign authorized classes & sections."
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <GlassInput
              label="Employee ID"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>

          <GlassInput
            label="Institutional Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <GlassInput
            label="Subjects Taught (comma-separated)"
            required
            value={subjectsInput}
            onChange={(e) => setSubjectsInput(e.target.value)}
          />

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Classes & Sections Assigned:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_CLASS_SECTIONS.map((item, idx) => {
                const isSelected = assignedClasses.some(
                  (a) => a.class === item.class && a.section === item.section
                );
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleClassAssignment(item)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                        : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xs">
                      {item.class} <span className="text-[11px] opacity-75">Sec {item.section}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/40 dark:border-white/10">
            <GlassButton variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit" isLoading={submitting}>
              Save Teacher Changes
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Reset Password Modal */}
      <GlassModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Teacher Password"
        description={`Set a new institutional password for ${targetTeacher?.name}.`}
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <GlassInput
            label="New Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
          />

          <div className="flex justify-end gap-3 pt-2">
            <GlassButton variant="secondary" type="button" onClick={() => setResetModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit" isLoading={submitting}>
              Update Password
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
