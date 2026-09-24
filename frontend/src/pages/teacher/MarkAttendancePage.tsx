import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { teacherService, ClassSectionAssignment } from '../../services/teacherService';
import { 
  attendanceService, 
  AttendanceRosterStudent, 
  AttendanceRosterResponse,
  AttendanceRecordItem 
} from '../../services/attendanceService';

export const MarkAttendancePage: React.FC = () => {
  const [assignments, setAssignments] = useState<ClassSectionAssignment[]>([]);
  const [selectedClassSection, setSelectedClassSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rosterData, setRosterData] = useState<AttendanceRosterResponse | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks: string }>
  >({});

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // 1. Fetch teacher assignments
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await teacherService.getMyAssignments();
      if (res.success && res.data) {
        const assigned = res.data.classesAssigned || [];
        setAssignments(assigned);
        setSubjects(res.data.subjectsTaught || []);
        if (res.data.subjectsTaught && res.data.subjectsTaught.length > 0) {
          setSelectedSubject(res.data.subjectsTaught[0]);
        }

        if (assigned.length > 0) {
          const first = `${assigned[0].class}__${assigned[0].section}`;
          setSelectedClassSection(first);
        }
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load teacher class assignments',
      });
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // 2. Fetch roster when class/section or date changes
  useEffect(() => {
    if (!selectedClassSection) return;
    const [cls, sec] = selectedClassSection.split('__');
    if (cls && sec && selectedDate) {
      loadRoster(cls, sec, selectedDate);
    }
  }, [selectedClassSection, selectedDate]);

  const loadRoster = async (cls: string, sec: string, dateStr: string) => {
    setIsLoadingRoster(true);
    setNotification(null);
    try {
      const res = await attendanceService.getRoster({ class: cls, section: sec, date: dateStr });
      if (res.success && res.data) {
        setRosterData(res.data);

        // Pre-populate records
        const initialMap: Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks: string }> = {};

        if (res.data.isAlreadyMarked && res.data.existingSession) {
          // Fill from existing session
          res.data.existingSession.records.forEach((rec) => {
            initialMap[rec.studentId] = {
              status: rec.status,
              remarks: rec.remarks || '',
            };
          });
          // For any students in roster not yet in session records (e.g. newly added)
          res.data.students.forEach((stu) => {
            if (!initialMap[stu.id]) {
              initialMap[stu.id] = { status: 'PRESENT', remarks: '' };
            }
          });
          setNotification({
            type: 'info',
            message: `Attendance was already recorded by ${res.data.existingSession.markedBy}. You can update it below.`,
          });
        } else {
          // Default all active students to PRESENT
          res.data.students.forEach((stu) => {
            initialMap[stu.id] = {
              status: 'PRESENT',
              remarks: '',
            };
          });
        }

        setAttendanceRecords(initialMap);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to load student roster',
      });
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    if (!rosterData) return;
    const updated = { ...attendanceRecords };
    rosterData.students.forEach((s) => {
      updated[s.id] = {
        ...(updated[s.id] || { remarks: '' }),
        status,
      };
    });
    setAttendanceRecords(updated);
  };

  const handleSubmit = async () => {
    if (!selectedClassSection || !rosterData) return;
    const [cls, sec] = selectedClassSection.split('__');

    const recordsPayload: AttendanceRecordItem[] = rosterData.students.map((stu) => ({
      studentId: stu.id,
      status: attendanceRecords[stu.id]?.status || 'PRESENT',
      remarks: attendanceRecords[stu.id]?.remarks || null,
    }));

    setIsSubmitting(true);
    setNotification(null);
    try {
      const res = await attendanceService.markAttendance({
        class: cls,
        section: sec,
        date: selectedDate,
        records: recordsPayload,
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: res.message || 'Attendance saved successfully!',
        });
        // Reload roster to reflect updated state
        loadRoster(cls, sec, selectedDate);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to record attendance',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tallies
  const students = rosterData?.students || [];
  const totalCount = students.length;
  const presentCount = students.filter((s) => attendanceRecords[s.id]?.status === 'PRESENT').length;
  const absentCount = students.filter((s) => attendanceRecords[s.id]?.status === 'ABSENT').length;
  const lateCount = students.filter((s) => attendanceRecords[s.id]?.status === 'LATE').length;
  const percentage = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal  flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-indigo-500" />
            Mark Daily Attendance
          </h1>
          <p className="text-sm text-muted  mt-1">
            Record and manage student presence for your assigned class rosters
          </p>
        </div>
      </div>

      {/* Class & Date Selector Card */}
      <GlassCard className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Class-Section Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal  mb-1.5">
              Assigned Class & Section
            </label>
            {isLoadingAssignments ? (
              <div className="h-10 rounded-xl bg-slate-200  animate-pulse" />
            ) : assignments.length === 0 ? (
              <p className="text-xs text-rose-500 py-2">No assigned classes found</p>
            ) : (
              <GlassSelect
                value={selectedClassSection}
                onChange={(e) => setSelectedClassSection(e.target.value)}
                options={assignments.map((a) => ({
                  value: `${a.class}__${a.section}`,
                  label: `${a.class} — Section ${a.section}`,
                }))}
              />
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal  mb-1.5">
              Date
            </label>
            <GlassInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Subject (Optional / Info) */}
          {subjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal  mb-1.5">
                Subject
              </label>
              <GlassSelect
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                options={subjects.map((sub) => ({
                  value: sub,
                  label: sub,
                }))}
              />
            </div>
          )}

          {/* Refresh Button */}
          <div>
            <GlassButton
              variant="outline"
              onClick={() => {
                if (selectedClassSection) {
                  const [cls, sec] = selectedClassSection.split('__');
                  loadRoster(cls, sec, selectedDate);
                }
              }}
              disabled={isLoadingRoster || !selectedClassSection}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRoster ? 'animate-spin' : ''}`} />
              Refresh Roster
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border backdrop-blur-md ${
            notification.type === 'success'
              ? 'bg-olive-600/15 border-olive-600/25 text-olive-800 '
              : notification.type === 'error'
              ? 'bg-terracotta/15 border-terracotta/25 text-terracotta '
              : 'bg-olive-500/15 border-olive-500/25 text-olive-800 '
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />}
          {notification.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-indigo-500" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* No Assignment Warning */}
      {!isLoadingAssignments && assignments.length === 0 && (
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-charcoal ">No Assigned Classes</h3>
          <p className="text-sm text-muted  mt-1 max-w-md mx-auto">
            Your account currently has no class sections assigned. Please reach out to an administrator to assign classes to your profile before marking attendance.
          </p>
        </GlassCard>
      )}

      {/* Attendance Workspace */}
      {selectedClassSection && (
        <>
          {/* Quick Metrics Bar & Bulk Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <GlassCard className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-olive-500/15  text-olive-700  flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Total Roster</p>
                <p className="text-lg font-bold text-charcoal ">{totalCount}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-olive-600/15  text-olive-800  flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Present</p>
                <p className="text-lg font-bold text-olive-800 ">{presentCount}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-terracotta/15  text-terracotta  flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Absent</p>
                <p className="text-lg font-bold text-terracotta ">{absentCount}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/15  text-gold-700  flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Late</p>
                <p className="text-lg font-bold text-gold-700 ">{lateCount}</p>
              </div>
            </GlassCard>

            <GlassCard className="p-3.5 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-spruce/15  text-spruce-700  flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted font-medium">Presence Rate</p>
                <p className="text-lg font-bold text-spruce-700 ">{percentage}%</p>
              </div>
            </GlassCard>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted mr-1">
                Quick Mark:
              </span>
              <GlassButton
                size="sm"
                variant="outline"
                className="hover:border-emerald-500 text-olive-800  text-xs flex items-center gap-1.5"
                onClick={() => handleMarkAll('PRESENT')}
                disabled={isLoadingRoster || totalCount === 0}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                All Present
              </GlassButton>
              <GlassButton
                size="sm"
                variant="outline"
                className="border border-terracotta/25 text-terracotta hover:bg-terracotta/10  text-xs flex items-center gap-1.5"
                onClick={() => handleMarkAll('ABSENT')}
                disabled={isLoadingRoster || totalCount === 0}
              >
                <XCircle className="w-3.5 h-3.5" />
                All Absent
              </GlassButton>
            </div>

            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingRoster || totalCount === 0}
              className="flex items-center gap-2 px-6"
            >
              <Save className="w-4 h-4" />
              {isSubmitting
                ? 'Saving...'
                : rosterData?.isAlreadyMarked
                ? 'Update Attendance'
                : 'Submit Attendance'}
            </GlassButton>
          </div>

          {/* Student Roster Table */}
          <GlassCard className="overflow-hidden">
            {isLoadingRoster ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted">Loading student roster...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-muted mx-auto mb-2" />
                <p className="text-base font-semibold text-charcoal ">
                  No Students Enrolled
                </p>
                <p className="text-xs text-muted mt-1">
                  There are currently no active students found in this class and section.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                      <th className="py-3.5 px-4 w-16">#</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4 text-center w-72">Attendance Status</th>
                      <th className="py-3.5 px-4 w-72">Remarks (Optional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-500/10  text-sm">
                    {students.map((student, idx) => {
                      const currentStatus = attendanceRecords[student.id]?.status || 'PRESENT';
                      const currentRemarks = attendanceRecords[student.id]?.remarks || '';

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-white/60  transition-colors"
                        >
                          {/* Index & Roll */}
                          <td className="py-3.5 px-4 text-xs font-semibold text-muted">
                            {idx + 1}
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 "
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                  {student.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-charcoal ">
                                  {student.name}
                                </p>
                                <p className="text-xs text-muted font-mono">
                                  Roll: {student.rollNumber}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Attendance Status Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex rounded-xl p-1 bg-stone-100/80  border border-olive-500/15  shadow-inner">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'PRESENT')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  currentStatus === 'PRESENT'
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                    : 'text-muted  hover:text-emerald-500'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'ABSENT')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  currentStatus === 'ABSENT'
                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                                    : 'text-muted  hover:text-rose-500'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(student.id, 'LATE')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  currentStatus === 'LATE'
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                    : 'text-muted  hover:text-amber-500'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Late
                              </button>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              value={currentRemarks}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              placeholder="e.g. Sick, Excused..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg bg-white/75  border border-olive-500/20  focus:outline-none focus:ring-1 focus:ring-olive-500/20 focus:border-olive-600 text-charcoal "
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Bottom Save Action */}
          {students.length > 0 && (
            <div className="flex justify-end pt-2">
              <GlassButton
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoadingRoster}
                className="flex items-center gap-2 px-8"
              >
                <Save className="w-5 h-5" />
                {isSubmitting
                  ? 'Saving Records...'
                  : rosterData?.isAlreadyMarked
                  ? 'Update Attendance Records'
                  : 'Submit Attendance Records'}
              </GlassButton>
            </div>
          )}
        </>
      )}
    </div>
  );
};
