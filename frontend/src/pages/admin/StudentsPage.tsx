import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UserX,
  UserCheck,
  FileText,
  ShieldAlert,
  Calendar,
  MapPin,
  HeartHandshake,
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
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [admissionModalOpen, setAdmissionModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  // Selected Student & Details
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentDetail | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [studentToDeactivate, setStudentToDeactivate] = useState<StudentListItem | null>(null);
  const [availableStructures, setAvailableStructures] = useState<FeeStructure[]>([]);
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);

  // Form State (New Admission & Edit)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rollNumber: '',
    admissionNumber: '',
    class: 'B.Tech CSE',
    batch: '2024-2028',
    section: 'A',
    admissionYear: 2024,
    admissionDate: new Date().toISOString().slice(0, 10),
    contactNumber: '',
    guardianName: '',
    guardianContact: '',
    guardianRelation: 'Father',
    dateOfBirth: '2006-05-15',
    gender: 'Male',
    address: '',
    photoUrl: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED',
    password: '',
    docAadhaar: true,
    docBirthCert: true,
    docTransferCert: true,
    docMarksheet: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAll({
        search: search || undefined,
        class: filterClass || undefined,
        section: filterSection || undefined,
        status: filterStatus || undefined,
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
  }, [filterClass, filterSection, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleOpenNewAdmission = () => {
    setFormError(null);
    const rand = Math.floor(Math.random() * 900 + 100);
    setFormData({
      name: '',
      email: '',
      rollNumber: `24CSE0${rand}`,
      admissionNumber: `ADM-2024-CSE-0${rand}`,
      class: 'B.Tech CSE',
      batch: '2024-2028',
      section: 'A',
      admissionYear: 2024,
      admissionDate: new Date().toISOString().slice(0, 10),
      contactNumber: '',
      guardianName: '',
      guardianContact: '',
      guardianRelation: 'Father',
      dateOfBirth: '2006-05-15',
      gender: 'Male',
      address: '',
      photoUrl: '',
      status: 'ACTIVE',
      password: 'Student@123',
      docAadhaar: true,
      docBirthCert: true,
      docTransferCert: true,
      docMarksheet: true,
    });
    setAdmissionModalOpen(true);
  };

  const handleOpenEdit = (student: StudentListItem) => {
    setFormError(null);
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber,
      admissionNumber: student.admissionNumber || '',
      class: student.class,
      batch: student.batch,
      section: student.section || 'A',
      admissionYear: student.admissionYear,
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : '',
      contactNumber: student.contactNumber,
      guardianName: student.guardianName || '',
      guardianContact: student.guardianContact || '',
      guardianRelation: student.guardianRelation || 'Father',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || 'Male',
      address: student.address || '',
      photoUrl: student.photoUrl || '',
      status: student.status,
      password: '',
      docAadhaar: student.documentsSubmitted?.aadhaar ?? true,
      docBirthCert: student.documentsSubmitted?.birthCertificate ?? true,
      docTransferCert: student.documentsSubmitted?.transferCertificate ?? true,
      docMarksheet: student.documentsSubmitted?.marksheets ?? true,
    });
    setEditModalOpen(true);
  };

  const handleCreateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await studentService.create({
        name: formData.name,
        email: formData.email,
        rollNumber: formData.rollNumber,
        admissionNumber: formData.admissionNumber || undefined,
        class: formData.class,
        batch: formData.batch,
        section: formData.section,
        admissionYear: Number(formData.admissionYear),
        admissionDate: formData.admissionDate,
        contactNumber: formData.contactNumber,
        guardianName: formData.guardianName,
        guardianContact: formData.guardianContact,
        guardianRelation: formData.guardianRelation,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        photoUrl: formData.photoUrl || undefined,
        status: formData.status,
        password: formData.password || undefined,
        documentsSubmitted: {
          aadhaar: formData.docAadhaar,
          birthCertificate: formData.docBirthCert,
          transferCertificate: formData.docTransferCert,
          marksheets: formData.docMarksheet,
        },
      });

      setAdmissionModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit admission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await studentService.update(editingStudent.id, {
        name: formData.name,
        class: formData.class,
        batch: formData.batch,
        section: formData.section,
        contactNumber: formData.contactNumber,
        admissionNumber: formData.admissionNumber,
        guardianName: formData.guardianName,
        guardianContact: formData.guardianContact,
        guardianRelation: formData.guardianRelation,
        gender: formData.gender,
        address: formData.address,
        photoUrl: formData.photoUrl || null,
        status: formData.status,
        documentsSubmitted: {
          aadhaar: formData.docAadhaar,
          birthCertificate: formData.docBirthCert,
          transferCertificate: formData.docTransferCert,
          marksheets: formData.docMarksheet,
        },
      });

      setEditModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateSubmit = async () => {
    if (!studentToDeactivate) return;
    try {
      setSubmitting(true);
      const newStatus = studentToDeactivate.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await studentService.updateStatus(studentToDeactivate.id, newStatus);
      setDeactivateModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssign = async (student: StudentListItem) => {
    try {
      setTargetStudentId(student.id);
      setSelectedStructureIds([]);
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

  const columns: Column<StudentListItem>[] = [
    {
      key: 'rollNumber',
      header: 'Student & Admission',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden flex-shrink-0">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              item.name.charAt(0)
            )}
          </div>
          <div>
            <span className="font-bold text-sm text-charcoal  block hover:text-olive-700 cursor-pointer" onClick={() => navigate(`/admin/students/${item.id}`)}>
              {item.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] font-bold text-olive-700  bg-olive-500/15 px-1.5 py-0.5 rounded">
                {item.rollNumber}
              </span>
              {item.admissionNumber && (
                <span className="text-[10px] text-muted font-mono">
                  {item.admissionNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class & Section',
      render: (item) => (
        <div>
          <span className="font-semibold text-charcoal  block text-xs">
            {item.class} • Sec {item.section || 'A'}
          </span>
          <span className="text-[11px] text-muted">{item.batch}</span>
        </div>
      ),
    },
    {
      key: 'contactNumber',
      header: 'Guardian & Contact',
      render: (item) => (
        <div>
          <span className="text-xs font-semibold text-charcoal  block">
            {item.guardianName ? `${item.guardianName} (${item.guardianRelation || 'P'})` : item.name}
          </span>
          <span className="text-[11px] text-muted flex items-center gap-1">
            <Phone className="w-3 h-3" /> {item.guardianContact || item.contactNumber}
          </span>
        </div>
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
                ? 'text-gold-700 '
                : 'text-olive-800 '
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
      key: 'status',
      header: 'Status',
      render: (item) => (
        <GlassBadge
          variant={
            item.status === 'ACTIVE'
              ? 'success'
              : item.status === 'INACTIVE'
              ? 'danger'
              : item.status === 'GRADUATED'
              ? 'purple'
              : 'warning'
          }
          size="sm"
        >
          {item.status}
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
            onClick={() => navigate(`/admin/students/${item.id}`)}
            className="p-1.5 rounded-lg text-muted hover:text-olive-700 hover:bg-white/80 "
            title="View Unified Student Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded-lg text-muted hover:text-olive-700 hover:bg-white/80 "
            title="Edit Student Details"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenAssign(item)}
            className="p-1.5 rounded-lg text-muted hover:text-olive-700 hover:bg-white/80 "
            title="Assign Fee Heads"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setStudentToDeactivate(item);
              setDeactivateModalOpen(true);
            }}
            className={`p-1.5 rounded-lg ${
              item.status === 'ACTIVE'
                ? 'text-muted hover:text-terracotta hover:bg-rose-50 '
                : 'text-terracotta hover:text-olive-800 hover:bg-emerald-50 '
            }`}
            title={item.status === 'ACTIVE' ? 'Deactivate Student' : 'Reactivate Student'}
          >
            <UserX className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-charcoal  tracking-tight">
            Student Records & Admissions
          </h2>
          <p className="text-xs sm:text-sm text-muted  mt-1">
            Institutional directory with full admissions records, guardian info, attendance status, and financial ledger
          </p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleOpenNewAdmission}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Admission
        </GlassButton>
      </div>

      {/* Filter and Search Bar */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <GlassInput
              placeholder="Search by name, roll no, or admission no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <GlassSelect
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
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            options={[
              { value: '', label: 'All Sections' },
              { value: 'A', label: 'Section A' },
              { value: 'B', label: 'Section B' },
              { value: 'C', label: 'Section C' },
            ]}
          />

          <GlassSelect
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'GRADUATED', label: 'Graduated' },
              { value: 'TRANSFERRED', label: 'Transferred' },
            ]}
          />
        </form>
      </GlassCard>

      {/* Student List Table */}
      <GlassTable
        keyExtractor={(row) => row.id}
        columns={columns}
        data={students}
        isLoading={loading}
        emptyMessage="No students found matching your criteria."
      />

      {/* New Admission Modal */}
      <GlassModal
        isOpen={admissionModalOpen}
        onClose={() => setAdmissionModalOpen(false)}
        title="New Student Admission"
        description="Register a new student with complete records. Auto-creates User portal account and assigns matching fee heads."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateAdmission} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta  flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Academic & Admission Identifiers */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olive-700  flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" /> 1. Academic & Admission Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <GlassInput
                label="Full Student Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Aarav Mehta"
              />
              <GlassInput
                label="Roll Number (Unique)"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 24CSE0105"
              />
              <GlassInput
                label="Admission Number"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="e.g. ADM-2024-CSE-0105"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <GlassSelect
                label="Class / Program"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                options={[
                  { value: 'B.Tech CSE', label: 'B.Tech CSE' },
                  { value: 'B.Tech IT', label: 'B.Tech IT' },
                  { value: 'BBA', label: 'BBA' },
                  { value: 'MBA', label: 'MBA' },
                ]}
              />
              <GlassInput
                label="Batch / Cohort"
                required
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                placeholder="2024-2028"
              />
              <GlassSelect
                label="Section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                options={[
                  { value: 'A', label: 'Section A' },
                  { value: 'B', label: 'Section B' },
                  { value: 'C', label: 'Section C' },
                ]}
              />
              <GlassInput
                label="Admission Date"
                type="date"
                value={formData.admissionDate}
                onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Personal & Contact Details */}
          <div className="space-y-3 pt-2 border-t border-olive-500/15 ">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olive-700  flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> 2. Personal & Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <GlassInput
                label="Institutional Email (User Login)"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student.name@college.edu"
              />
              <GlassInput
                label="Student Phone Number"
                required
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="+91 98765 43210"
              />
              <GlassInput
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <GlassSelect
                label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <div className="sm:col-span-2">
                <GlassInput
                  label="Residential Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, locality, city, state, postal code"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Guardian Details */}
          <div className="space-y-3 pt-2 border-t border-olive-500/15 ">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olive-700  flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5" /> 3. Guardian Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <GlassInput
                label="Guardian Full Name"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                placeholder="e.g. Suresh Mehta"
              />
              <GlassInput
                label="Guardian Contact Number"
                value={formData.guardianContact}
                onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                placeholder="+91 98765 43299"
              />
              <GlassSelect
                label="Relationship"
                value={formData.guardianRelation}
                onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                options={[
                  { value: 'Father', label: 'Father' },
                  { value: 'Mother', label: 'Mother' },
                  { value: 'Legal Guardian', label: 'Legal Guardian' },
                ]}
              />
            </div>
          </div>

          {/* Section 4: Documents Submitted */}
          <div className="space-y-3 pt-2 border-t border-olive-500/15 ">
            <h4 className="text-xs font-bold uppercase tracking-wider text-olive-700  flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> 4. Documents Submitted Checklist
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60  border border-olive-500/15  cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.docAadhaar}
                  onChange={(e) => setFormData({ ...formData, docAadhaar: e.target.checked })}
                  className="rounded text-olive-700 focus:ring-olive-500"
                />
                <span className="text-xs font-semibold">Aadhaar Card</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60  border border-olive-500/15  cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.docBirthCert}
                  onChange={(e) => setFormData({ ...formData, docBirthCert: e.target.checked })}
                  className="rounded text-olive-700 focus:ring-olive-500"
                />
                <span className="text-xs font-semibold">Birth Certificate</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60  border border-olive-500/15  cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.docTransferCert}
                  onChange={(e) => setFormData({ ...formData, docTransferCert: e.target.checked })}
                  className="rounded text-olive-700 focus:ring-olive-500"
                />
                <span className="text-xs font-semibold">Transfer Certificate</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60  border border-olive-500/15  cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.docMarksheet}
                  onChange={(e) => setFormData({ ...formData, docMarksheet: e.target.checked })}
                  className="rounded text-olive-700 focus:ring-olive-500"
                />
                <span className="text-xs font-semibold">Marksheets (10+2)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <GlassButton variant="secondary" type="button" onClick={() => setAdmissionModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit" isLoading={submitting}>
              Complete Admission & Register
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Edit Student Modal */}
      <GlassModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Student Records"
        description="Modify student profile, guardian information, section, and submission statuses."
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-terracotta/15 border border-terracotta/30 text-xs text-terracotta  flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              label="Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <GlassSelect
              label="Class"
              value={formData.class}
              onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              options={[
                { value: 'B.Tech CSE', label: 'B.Tech CSE' },
                { value: 'B.Tech IT', label: 'B.Tech IT' },
                { value: 'BBA', label: 'BBA' },
                { value: 'MBA', label: 'MBA' },
              ]}
            />
            <GlassSelect
              label="Section"
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              options={[
                { value: 'A', label: 'Section A' },
                { value: 'B', label: 'Section B' },
                { value: 'C', label: 'Section C' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassInput
              label="Contact Number"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            />
            <GlassInput
              label="Guardian Name"
              value={formData.guardianName}
              onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
            />
            <GlassInput
              label="Guardian Contact"
              value={formData.guardianContact}
              onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassSelect
              label="Student Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'GRADUATED', label: 'GRADUATED' },
                { value: 'TRANSFERRED', label: 'TRANSFERRED' },
              ]}
            />
            <div className="sm:col-span-2">
              <GlassInput
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <GlassButton variant="secondary" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="primary" type="submit" isLoading={submitting}>
              Save Changes
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Deactivate / Reactivate Student Confirmation */}
      <GlassModal
        isOpen={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title={studentToDeactivate?.status === 'ACTIVE' ? 'Deactivate Student Account' : 'Reactivate Student Account'}
        description="Historical Fees, Attendance, and Ledger records are strictly preserved."
      >
        <div className="space-y-4">
          <p className="text-sm text-muted ">
            Are you sure you want to {studentToDeactivate?.status === 'ACTIVE' ? 'deactivate' : 'reactivate'}{' '}
            <strong className="text-charcoal ">{studentToDeactivate?.name}</strong> (Roll Number:{' '}
            <span className="font-mono text-olive-700">{studentToDeactivate?.rollNumber}</span>)?
          </p>

          {studentToDeactivate?.status === 'ACTIVE' && (
            <div className="p-3 rounded-xl bg-gold/15 border border-gold/30 text-xs text-gold-700  flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Deactivating prevents student login, but preserves all financial transactions and attendance history.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <GlassButton variant="secondary" onClick={() => setDeactivateModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant={studentToDeactivate?.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={handleDeactivateSubmit}
              isLoading={submitting}
            >
              {studentToDeactivate?.status === 'ACTIVE' ? 'Confirm Deactivation' : 'Confirm Reactivation'}
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Assign Fee Heads Modal */}
      <GlassModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Fee Structures"
        description="Attach fee structures to this student's ledger."
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {availableStructures.length === 0 ? (
              <p className="text-xs text-muted">No fee structures found for this class.</p>
            ) : (
              availableStructures.map((fs) => (
                <label
                  key={fs.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/60  border border-olive-500/15  cursor-pointer hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedStructureIds.includes(fs.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStructureIds([...selectedStructureIds, fs.id]);
                        } else {
                          setSelectedStructureIds(selectedStructureIds.filter((id) => id !== fs.id));
                        }
                      }}
                      className="rounded text-olive-700 focus:ring-olive-500"
                    />
                    <div>
                      <span className="text-xs font-bold block">{fs.feeHead}</span>
                      <span className="text-[11px] text-muted">
                        {fs.academicYear} • Due: {new Date(fs.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-olive-700 ">
                    ₹ {fs.amount.toLocaleString('en-IN')}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <GlassButton variant="secondary" type="button" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              type="submit"
              isLoading={submitting}
              disabled={selectedStructureIds.length === 0}
            >
              Assign Selected ({selectedStructureIds.length})
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
