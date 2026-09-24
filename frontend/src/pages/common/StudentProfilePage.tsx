import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileCheck2,
  ReceiptText,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ShieldAlert,
  CreditCard,
  Building,
  HeartHandshake,
  AlertCircle,
  BookOpen,
  BookmarkCheck,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassButton } from '../../components/ui/GlassButton';
import { useAuth } from '../../context/AuthContext';
import { studentService, UnifiedStudentProfile } from '../../services/studentService';

export const StudentProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UnifiedStudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'attendance' | 'library'>('overview');

  useEffect(() => {
    loadProfile();
  }, [id, user]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (id) {
        res = await studentService.getProfile(id);
      } else if (user?.role === 'STUDENT') {
        res = await studentService.getMyUnifiedProfile();
      } else {
        throw new Error('No student identifier specified');
      }

      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load unified student profile');
    } finally {
      setIsLoading(false);
    }
  };

  const student = profile?.student;
  const fees = profile?.fees;
  const attendance = profile?.attendance;
  const library = profile?.library;

  const formatCurrency = (val?: number) => {
    return `₹${(val || 0).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Back button if admin */}
      {id && user?.role === 'ADMIN' && (
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/students')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted  hover:text-olive-700  transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Directory
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-20 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted font-medium">Assembling unified student record...</p>
        </div>
      ) : error ? (
        <GlassCard className="p-8 text-center border-rose-500/30">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-charcoal ">Profile Unavailable</h3>
          <p className="text-xs text-muted mt-1 mb-4">{error}</p>
          <GlassButton variant="outline" onClick={loadProfile}>
            Retry
          </GlassButton>
        </GlassCard>
      ) : student ? (
        <>
          {/* Header Dossier Banner */}
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg shadow-indigo-500/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-500/30">
                    {student.name.charAt(0)}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-charcoal ">
                      {student.name}
                    </h1>
                    <GlassBadge
                      variant={
                        student.status === 'ACTIVE'
                          ? 'success'
                          : student.status === 'GRADUATED'
                          ? 'info'
                          : student.status === 'TRANSFERRED'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {student.status}
                    </GlassBadge>
                    {student.user && (
                      <span className="text-[11px] font-semibold text-muted  bg-white/70  px-2 py-0.5 rounded-md">
                        {student.user.isActive ? 'Portal Active' : 'Portal Locked'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted  mt-2 flex-wrap font-mono">
                    <span>Roll: <strong className="text-charcoal ">{student.rollNumber}</strong></span>
                    {student.admissionNumber && (
                      <span>Admission: <strong className="text-charcoal ">{student.admissionNumber}</strong></span>
                    )}
                    <span>Class: <strong className="text-charcoal ">{student.class} — Sec {student.section}</strong></span>
                    <span>Batch: <strong className="text-charcoal ">{student.batch}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Contact Chips */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 text-xs text-muted ">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{student.user?.email || 'No email on file'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{student.contactNumber || 'No phone'}</span>
                </div>
                {student.guardianName && (
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-3.5 h-3.5 text-purple-500" />
                    <span>Guardian: {student.guardianName} ({student.guardianRelation || 'Guardian'})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-t border-olive-500/15  mt-6 pt-4">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-olive-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-muted  hover:bg-white/75 '
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Comprehensive Dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fees')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'fees'
                    ? 'bg-olive-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-muted  hover:bg-white/75 '
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                Financial Ledger
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-olive-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-muted  hover:bg-white/75 '
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Attendance Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'library'
                    ? 'bg-olive-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-muted  hover:bg-white/75 '
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Library & Books
                {library && library.overdueIssuesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                    {library.overdueIssuesCount} Overdue
                  </span>
                )}
              </button>
            </div>
          </GlassCard>

          {/* TAB 1: Comprehensive Dossier */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Personal Information */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider flex items-center gap-2 border-b border-olive-500/15  pb-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Personal Information
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Date of Birth:</span>
                    <span className="font-semibold text-charcoal  font-mono">
                      {student.dateOfBirth || 'Not Recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Gender:</span>
                    <span className="font-semibold text-charcoal ">
                      {student.gender || 'Not Specified'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Student Contact:</span>
                    <span className="font-semibold text-charcoal  font-mono">
                      {student.contactNumber}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-muted block mb-1">Residential Address:</span>
                    <p className="text-charcoal  font-medium bg-white/60  p-2.5 rounded-lg border border-olive-500/15 ">
                      {student.address || 'No residential address documented.'}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Guardian & Emergency Contacts */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider flex items-center gap-2 border-b border-olive-500/15  pb-2">
                  <HeartHandshake className="w-4 h-4 text-purple-500" />
                  Guardian & Emergency
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Primary Guardian:</span>
                    <span className="font-semibold text-charcoal ">
                      {student.guardianName || 'Not Recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Relationship:</span>
                    <span className="font-semibold text-charcoal ">
                      {student.guardianRelation || 'Guardian'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Guardian Contact:</span>
                    <span className="font-semibold text-charcoal  font-mono">
                      {student.guardianContact || 'Not Recorded'}
                    </span>
                  </div>
                </div>
              </GlassCard>

              {/* Admissions & Documents */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider flex items-center gap-2 border-b border-olive-500/15  pb-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-500" />
                  Admission & Documents
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Admission Date:</span>
                    <span className="font-semibold text-charcoal  font-mono">
                      {student.admissionDate || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-olive-500/10 ">
                    <span className="text-muted">Enrollment Year:</span>
                    <span className="font-semibold text-charcoal ">
                      {student.admissionYear}
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className="text-muted block mb-2 font-semibold">
                      Submitted Verification Documents:
                    </span>
                    {student.documentsSubmitted &&
                    Object.keys(student.documentsSubmitted).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(student.documentsSubmitted).map(([doc, submitted]) => (
                          <div
                            key={doc}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/60  border border-olive-500/15 "
                          >
                            <span className="text-charcoal  font-medium">
                              {doc.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            {submitted ? (
                              <span className="text-emerald-500 flex items-center gap-1 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified
                              </span>
                            ) : (
                              <span className="text-muted flex items-center gap-1 font-semibold text-[11px]">
                                <XCircle className="w-3.5 h-3.5" />
                                Pending
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted italic">No document checklist recorded.</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 2: Financial Ledger */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {/* Financial KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GlassCard className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-olive-500/15  text-olive-700  flex items-center justify-center font-bold">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase">Total Assigned</p>
                    <p className="text-xl font-extrabold text-charcoal ">
                      {formatCurrency(fees?.totalAssigned)}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-olive-600/15  text-olive-800  flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase">Total Paid</p>
                    <p className="text-xl font-extrabold text-olive-800 ">
                      {formatCurrency(fees?.totalPaid)}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-terracotta/15  text-terracotta  flex items-center justify-center font-bold">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase">Outstanding Due</p>
                    <p className="text-xl font-extrabold text-terracotta ">
                      {formatCurrency(fees?.totalPending)}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Fee Heads Breakdown Table */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
                  <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider">
                    Assigned Fee Heads Breakdown
                  </h3>
                  <span className="text-xs text-muted font-mono">
                    {fees?.heads?.length || 0} Fee Structures Assigned
                  </span>
                </div>

                {!fees?.heads || fees.heads.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">
                    No fee heads currently assigned to this student.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                          <th className="py-3.5 px-4">Fee Head</th>
                          <th className="py-3.5 px-4">Due Date</th>
                          <th className="py-3.5 px-4 text-right">Assigned</th>
                          <th className="py-3.5 px-4 text-right">Paid</th>
                          <th className="py-3.5 px-4 text-right">Pending</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-500/10  text-sm">
                        {fees.heads.map((h) => (
                          <tr
                            key={h.feeAssignmentId}
                            className="hover:bg-white/60  transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-charcoal ">
                              {h.feeHead}
                              <span className="block text-[11px] text-muted font-mono font-normal">
                                {h.academicYear}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-muted ">
                              {h.dueDate}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-charcoal ">
                              {formatCurrency(h.assignedAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-olive-800  font-semibold">
                              {formatCurrency(h.paidAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-terracotta  font-semibold">
                              {formatCurrency(h.pendingAmount)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <GlassBadge
                                variant={
                                  h.status === 'PAID'
                                    ? 'success'
                                    : h.status === 'OVERDUE'
                                    ? 'danger'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {h.status}
                              </GlassBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 3: Attendance Log */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Attendance KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-spruce/15  text-spruce-700  flex items-center justify-center font-bold">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Turnout %</p>
                    <p className="text-lg font-bold text-spruce-700 ">
                      {attendance?.percentage ?? 0}%
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-olive-600/15  text-olive-800  flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Present</p>
                    <p className="text-lg font-bold text-olive-800 ">
                      {attendance?.presentCount ?? 0}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta/15  text-terracotta  flex items-center justify-center font-bold">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Absent</p>
                    <p className="text-lg font-bold text-terracotta ">
                      {attendance?.absentCount ?? 0}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/15  text-gold-700  flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Late</p>
                    <p className="text-lg font-bold text-gold-700 ">
                      {attendance?.lateCount ?? 0}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Attendance Log Table */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
                  <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider">
                    Recent Attendance Records
                  </h3>
                  <span className="text-xs text-muted font-mono">
                    Total {attendance?.totalSessions ?? 0} Recorded Sessions
                  </span>
                </div>

                {!attendance?.recentRecords || attendance.recentRecords.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">
                    No attendance sessions logged for this student yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Instructor</th>
                          <th className="py-3 px-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-500/10  text-sm">
                        {attendance.recentRecords.map((rec) => (
                          <tr
                            key={rec.id}
                            className="hover:bg-white/60  transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-medium text-charcoal ">
                              {rec.date}
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-charcoal ">
                              {rec.class} - {rec.section}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <GlassBadge
                                variant={
                                  rec.status === 'PRESENT'
                                    ? 'success'
                                    : rec.status === 'LATE'
                                    ? 'warning'
                                    : 'danger'
                                }
                                size="sm"
                              >
                                {rec.status}
                              </GlassBadge>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted ">
                              {rec.markedBy}
                            </td>
                            <td className="py-3 px-4 text-xs text-muted">
                              {rec.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {/* TAB 4: Library & Circulation Log */}
          {activeTab === 'library' && (
            <div className="space-y-6">
              {/* Library KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-olive-500/15  text-olive-700  flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Active Loans</p>
                    <p className="text-lg font-bold text-charcoal ">
                      {library?.activeIssuesCount ?? 0}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-terracotta/15  text-terracotta  flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Overdue Books</p>
                    <p className="text-lg font-bold text-terracotta ">
                      {library?.overdueIssuesCount ?? 0}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/15  text-gold-700  flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Pending Fines</p>
                    <p className="text-lg font-bold text-gold-700 ">
                      {formatCurrency(library?.totalPendingFines)}
                    </p>
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-olive-600/15  text-olive-800  flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted font-medium">Paid Fines</p>
                    <p className="text-lg font-bold text-olive-800 ">
                      {formatCurrency(library?.totalPaidFines)}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Active Book Loans Table */}
              <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
                  <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider">
                    Currently Issued Books
                  </h3>
                  <span className="text-xs text-muted font-mono">
                    Fine Rate: ₹2.00 / day overdue
                  </span>
                </div>

                {!library?.activeIssues || library.activeIssues.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">
                    No active book loans currently assigned to this student.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                          <th className="py-3.5 px-4">Book Title</th>
                          <th className="py-3.5 px-4">Author</th>
                          <th className="py-3.5 px-4">ISBN</th>
                          <th className="py-3.5 px-4">Issued On</th>
                          <th className="py-3.5 px-4">Due Date</th>
                          <th className="py-3.5 px-4 text-center">Status</th>
                          <th className="py-3.5 px-4 text-right">Accrued Fine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-500/10  text-sm">
                        {library.activeIssues.map((issue) => (
                          <tr
                            key={issue.id}
                            className="hover:bg-white/60  transition-colors"
                          >
                            <td className="py-3.5 px-4 font-semibold text-charcoal ">
                              {issue.title}
                              <span className="block text-[11px] text-muted font-normal">
                                {issue.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-muted ">
                              {issue.author}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-muted">
                              {issue.isbn}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-muted ">
                              {new Date(issue.issueDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono text-muted ">
                              {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <GlassBadge
                                variant={issue.isOverdue ? 'danger' : 'success'}
                                size="sm"
                              >
                                {issue.isOverdue ? `${issue.daysOverdue} Days Overdue` : 'Active Loan'}
                              </GlassBadge>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-terracotta ">
                              {formatCurrency(issue.accruedFine)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>

              {/* Historical Loans Table */}
              {library?.history && library.history.length > 0 && (
                <GlassCard className="overflow-hidden">
                  <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
                    <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider">
                      Borrowing & Return History
                    </h3>
                    <span className="text-xs text-muted font-mono">
                      {library.history.length} Past Loans
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                          <th className="py-3 px-4">Book</th>
                          <th className="py-3 px-4">Borrowed</th>
                          <th className="py-3 px-4">Due Date</th>
                          <th className="py-3 px-4">Returned On</th>
                          <th className="py-3 px-4 text-center">Fine Status</th>
                          <th className="py-3 px-4 text-right">Fine Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-500/10  text-sm">
                        {library.history.map((hist) => (
                          <tr
                            key={hist.id}
                            className="hover:bg-white/60  transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-charcoal ">
                              {hist.title}
                              <span className="block text-[11px] text-muted">
                                {hist.author}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-muted ">
                              {new Date(hist.issueDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-muted ">
                              {new Date(hist.dueDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-xs font-mono text-muted ">
                              {hist.returnDate ? new Date(hist.returnDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hist.fineStatus ? (
                                <GlassBadge
                                  variant={
                                    hist.fineStatus === 'PAID'
                                      ? 'success'
                                      : hist.fineStatus === 'WAIVED'
                                      ? 'info'
                                      : 'warning'
                                  }
                                  size="sm"
                                >
                                  {hist.fineStatus}
                                </GlassBadge>
                              ) : (
                                <span className="text-xs text-muted">Clear</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-charcoal ">
                              {hist.fineAmount ? formatCurrency(hist.fineAmount) : '₹0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
