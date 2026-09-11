import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Edit3,
  AlertCircle,
  Search,
  Users,
  Save,
  Check
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassModal } from '../../components/ui/GlassModal';
import { teacherService, ClassSectionAssignment } from '../../services/teacherService';
import {
  attendanceService,
  AttendanceSessionListItem,
  AttendanceRecordItem
} from '../../services/attendanceService';

export const AttendanceHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSessionListItem[]>([]);
  const [assignments, setAssignments] = useState<ClassSectionAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal for viewing / editing session records
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any | null>(null);
  const [editedRecords, setEditedRecords] = useState<Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks: string }>>({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [assignRes, sessRes] = await Promise.all([
        teacherService.getMyAssignments().catch(() => ({ success: false, data: null })),
        attendanceService.getSessions(),
      ]);

      if (assignRes.success && assignRes.data) {
        setAssignments(assignRes.data.classesAssigned || []);
      }

      if (sessRes.success) {
        setSessions(sessRes.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (selectedClass !== 'ALL') {
        const [cls, sec] = selectedClass.split('__');
        if (cls) params.class = cls;
        if (sec) params.section = sec;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await attendanceService.getSessions(params);
      if (res.success) {
        setSessions(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to filter sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetFilter = () => {
    setSelectedClass('ALL');
    setStartDate('');
    setEndDate('');
    loadInitialData();
  };

  const handleOpenDetailModal = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsLoadingDetail(true);
    setModalFeedback(null);
    try {
      const res = await attendanceService.getSessionById(sessionId);
      if (res.success && res.data) {
        setSessionDetail(res.data);
        const recordsMap: Record<string, { status: 'PRESENT' | 'ABSENT' | 'LATE'; remarks: string }> = {};
        (res.data.records || []).forEach((r: any) => {
          recordsMap[r.studentId] = {
            status: r.status,
            remarks: r.remarks || '',
          };
        });
        setEditedRecords(recordsMap);
      }
    } catch (err: any) {
      setModalFeedback({
        type: 'error',
        text: err.message || 'Failed to load session details',
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleStatusChangeInModal = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setEditedRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChangeInModal = (studentId: string, remarks: string) => {
    setEditedRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleSaveModalUpdates = async () => {
    if (!activeSessionId || !sessionDetail) return;
    setIsSavingChanges(true);
    setModalFeedback(null);
    try {
      const payload: AttendanceRecordItem[] = (sessionDetail.records || []).map((rec: any) => ({
        studentId: rec.studentId,
        status: editedRecords[rec.studentId]?.status || rec.status,
        remarks: editedRecords[rec.studentId]?.remarks ?? rec.remarks,
      }));

      const res = await attendanceService.updateSession(activeSessionId, payload);
      if (res.success) {
        setModalFeedback({
          type: 'success',
          text: 'Attendance records updated successfully!',
        });
        // Refresh session list
        handleApplyFilter();
      }
    } catch (err: any) {
      setModalFeedback({
        type: 'error',
        text: err.message || 'Failed to update records',
      });
    } finally {
      setIsSavingChanges(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-500" />
            Attendance History & Audits
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review past attendance records, check presence percentages, and make record adjustments
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <GlassCard className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Class Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Class & Section
            </label>
            <GlassSelect
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={[
                { value: 'ALL', label: 'All My Assigned Classes' },
                ...assignments.map((a) => ({
                  value: `${a.class}__${a.section}`,
                  label: `${a.class} — Sec ${a.section}`,
                })),
              ]}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              From Date
            </label>
            <GlassInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              To Date
            </label>
            <GlassInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <GlassButton
              variant="primary"
              onClick={handleApplyFilter}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5"
            >
              <Filter className="w-4 h-4" />
              Filter
            </GlassButton>
            <GlassButton
              variant="outline"
              onClick={handleResetFilter}
              disabled={isLoading}
            >
              Reset
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Sessions Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">Loading session history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No Attendance Sessions Found
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filter criteria or record new attendance from the Mark Attendance page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Class & Section</th>
                  <th className="py-3.5 px-4 text-center">Roster Size</th>
                  <th className="py-3.5 px-4 text-center">Present</th>
                  <th className="py-3.5 px-4 text-center">Absent</th>
                  <th className="py-3.5 px-4 text-center">Late</th>
                  <th className="py-3.5 px-4 text-center">Turnout</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                {sessions.map((sess) => {
                  const turnout = sess.total > 0
                    ? Math.round(((sess.present + sess.late) / sess.total) * 100)
                    : 0;

                  return (
                    <tr
                      key={sess.id}
                      className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {sess.date}
                      </td>

                      {/* Class & Section */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-white">
                        {sess.class} — Sec {sess.section}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-600 dark:text-slate-300">
                        {sess.total}
                      </td>

                      {/* Present */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {sess.present}
                        </span>
                      </td>

                      {/* Absent */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          {sess.absent}
                        </span>
                      </td>

                      {/* Late */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          {sess.late}
                        </span>
                      </td>

                      {/* Turnout % */}
                      <td className="py-3.5 px-4 text-center">
                        <GlassBadge
                          variant={
                            turnout >= 75
                              ? 'success'
                              : turnout >= 50
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {turnout}%
                        </GlassBadge>
                      </td>

                      {/* Marked By */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {sess.markedBy}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetailModal(sess.id)}
                          className="flex items-center gap-1.5 ml-auto text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          View / Edit
                        </GlassButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* View / Edit Session Modal */}
      <GlassModal
        isOpen={Boolean(activeSessionId)}
        onClose={() => {
          setActiveSessionId(null);
          setSessionDetail(null);
        }}
        title={`Session Details: ${sessionDetail ? `${sessionDetail.class} - Section ${sessionDetail.section} (${sessionDetail.date})` : 'Loading...'}`}
      >
        <div className="space-y-4">
          {modalFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                modalFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {modalFeedback.text}
            </div>
          )}

          {isLoadingDetail ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading student marks...</p>
            </div>
          ) : sessionDetail ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-200/50 dark:border-white/10">
                <span>
                  Recorded by: <strong className="text-slate-800 dark:text-white">{sessionDetail.teacher?.name || 'Instructor'}</strong>
                </span>
                <span>
                  Total enrolled: <strong className="text-slate-800 dark:text-white">{sessionDetail.records?.length || 0}</strong>
                </span>
              </div>

              {/* Records List */}
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {(sessionDetail.records || []).map((rec: any) => {
                  const currentStatus = editedRecords[rec.studentId]?.status || rec.status;
                  const currentRemarks = editedRecords[rec.studentId]?.remarks ?? (rec.remarks || '');

                  return (
                    <div
                      key={rec.id || rec.studentId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {rec.student?.name || 'Student'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          Roll: {rec.student?.rollNumber}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Status Buttons */}
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-800 text-xs">
                          <button
                            type="button"
                            onClick={() => handleStatusChangeInModal(rec.studentId, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChangeInModal(rec.studentId, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'ABSENT'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChangeInModal(rec.studentId, 'LATE')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              currentStatus === 'LATE'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            L
                          </button>
                        </div>

                        {/* Remarks Input */}
                        <input
                          type="text"
                          value={currentRemarks}
                          onChange={(e) => handleRemarksChangeInModal(rec.studentId, e.target.value)}
                          placeholder="Remarks..."
                          className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 w-36"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/50 dark:border-white/10">
                <GlassButton
                  variant="outline"
                  onClick={() => {
                    setActiveSessionId(null);
                    setSessionDetail(null);
                  }}
                  disabled={isSavingChanges}
                >
                  Close
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleSaveModalUpdates}
                  disabled={isSavingChanges}
                  className="flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSavingChanges ? 'Saving Changes...' : 'Save Changes'}
                </GlassButton>
              </div>
            </>
          ) : null}
        </div>
      </GlassModal>
    </div>
  );
};
