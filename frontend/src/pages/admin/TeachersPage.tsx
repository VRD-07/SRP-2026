import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  KeyRound,
  UserCheck,
  UserX,
  AlertCircle,
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
      if (res.success) {
        setTeachers(res.data);
      }
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
    setName('');
    setEmail('');
    setEmployeeId('');
    setSubjectsInput('');
    setAssignedClasses([]);
    setPassword('Teacher@123');
    setFormError(null);
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (t: TeacherListItem) => {
    setEditingTeacher(t);
    setName(t.name);
    setEmail(t.email);
    setEmployeeId(t.employeeId);
    setSubjectsInput(t.subjectsTaught ? t.subjectsTaught.join(', ') : '');
    setAssignedClasses(t.classesAssigned || []);
    setFormError(null);
    setEditModalOpen(true);
  };

  const handleOpenReset = (t: TeacherListItem) => {
    setTargetTeacher(t);
    setNewPassword('');
    setFormError(null);
    setResetModalOpen(true);
  };

  const toggleClassAssignment = (item: ClassSectionAssignment) => {
    setAssignedClasses((prev) => {
      const exists = prev.some((a) => a.class === item.class && a.section === item.section);
      if (exists) {
        return prev.filter((a) => !(a.class === item.class && a.section === item.section));
      } else {
        return [...prev, item];
      }
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const subjects = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await teacherService.create({
        name,
        email,
        employeeId,
        password,
        subjectsTaught: subjects,
        classesAssigned: assignedClasses,
      });

      if (res.success) {
        setCreateModalOpen(false);
        fetchTeachers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to create teacher account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const subjects = subjectsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await teacherService.update(editingTeacher.id, {
        name,
        email,
        employeeId,
        subjectsTaught: subjects,
        classesAssigned: assignedClasses,
      });

      if (res.success) {
        setEditModalOpen(false);
        fetchTeachers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to update teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (t: TeacherListItem) => {
    const action = t.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${t.name}?`)) return;

    try {
      await teacherService.updateStatus(t.id, !t.isActive);
      fetchTeachers();
    } catch (err: any) {
      alert(`Status toggle failed: ${err.message}`);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacher) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await teacherService.resetPassword(targetTeacher.id, newPassword);
      setResetModalOpen(false);
      alert(`Password updated successfully for ${targetTeacher.name}`);
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
        <span className="font-mono font-bold text-xs text-olive-800 bg-olive-500/15 px-2.5 py-1 rounded-lg">
          {item.employeeId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Faculty Name',
      render: (item) => (
        <div>
          <span className="font-bold text-sm text-charcoal block">
            {item.name}
          </span>
          <span className="text-xs text-muted">{item.email}</span>
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
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-olive-500/15 text-olive-800 border border-olive-500/25"
              >
                {ca.class} ({ca.section})
              </span>
            ))
          ) : (
            <span className="text-xs text-muted italic">No classes assigned</span>
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
              className="text-[11px] text-charcoal bg-white/70 px-2 py-0.5 rounded-md border border-olive-500/15"
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
            className="p-1.5 rounded-lg text-muted hover:text-olive-700 hover:bg-white/80 cursor-pointer"
            title="Edit Teacher & Class Assignments"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenReset(item)}
            className="p-1.5 rounded-lg text-muted hover:text-gold-700 hover:bg-white/80 cursor-pointer"
            title="Reset Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(item)}
            className={`p-1.5 rounded-lg cursor-pointer ${
              item.isActive
                ? 'text-muted hover:text-terracotta hover:bg-terracotta/10'
                : 'text-terracotta hover:text-olive-700 hover:bg-olive-500/15'
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
          <h2 className="text-xl sm:text-2xl font-black text-charcoal tracking-tight">
            Faculty & Teacher Management
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
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
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta flex items-center gap-2">
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
            <label className="text-xs font-bold text-charcoal block mb-2">
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
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-olive-500/15 border-olive-600 text-olive-800 font-bold shadow-xs'
                        : 'bg-white/50 border-olive-500/15 text-charcoal hover:bg-white/70'
                    }`}
                  >
                    <span className="text-xs">
                      {item.class} <span className="text-[11px] opacity-75">Sec {item.section}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-olive-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-olive-500/15">
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
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta flex items-center gap-2">
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
            <label className="text-xs font-bold text-charcoal block mb-2">
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
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-olive-500/15 border-olive-600 text-olive-800 font-bold shadow-xs'
                        : 'bg-white/50 border-olive-500/15 text-charcoal hover:bg-white/70'
                    }`}
                  >
                    <span className="text-xs">
                      {item.class} <span className="text-[11px] opacity-75">Sec {item.section}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-olive-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-olive-500/15">
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
