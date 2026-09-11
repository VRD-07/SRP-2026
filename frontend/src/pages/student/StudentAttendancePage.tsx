import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  Info,
  Calendar,
  UserCheck
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassButton } from '../../components/ui/GlassButton';
import { attendanceService, StudentSelfAttendance } from '../../services/attendanceService';

export const StudentAttendancePage: React.FC = () => {
  const [data, setData] = useState<StudentSelfAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await attendanceService.getMyAttendance();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance record');
    } finally {
      setIsLoading(false);
    }
  };

  const summary = data?.summary;
  const percentage = summary?.percentage ?? 0;
  const isEligible = percentage >= 75;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-indigo-500" />
            My Attendance Record
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of your academic attendance, sessions, and examination eligibility
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="p-16 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500 font-medium">Fetching attendance history...</p>
        </div>
      ) : error ? (
        <GlassCard className="p-6 text-center border-rose-500/30">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <p className="text-base font-semibold text-rose-600 dark:text-rose-400">Failed to Load</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">{error}</p>
          <GlassButton variant="outline" onClick={fetchMyAttendance}>
            Try Again
          </GlassButton>
        </GlassCard>
      ) : data ? (
        <>
          {/* Eligibility Banner */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between gap-4 border backdrop-blur-md ${
              isEligible
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {isEligible ? (
                <Award className="w-6 h-6 flex-shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-500" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {isEligible
                    ? 'Examination Clearance Confirmed'
                    : 'Attendance Shortage Alert'}
                </p>
                <p className="text-xs opacity-90">
                  {isEligible
                    ? `Your attendance is ${percentage}%, well above the university mandatory threshold of 75%.`
                    : `Your attendance is ${percentage}%, currently below the 75% requirement. Please contact your faculty advisor.`}
                </p>
              </div>
            </div>
            <GlassBadge
              variant={isEligible ? 'success' : 'danger'}
              size="md"
            >
              {percentage}% Overall
            </GlassBadge>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Sessions</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">
                  {summary?.totalSessions ?? 0}
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Present</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {summary?.present ?? 0}
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Absent</p>
                <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                  {summary?.absent ?? 0}
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Late</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {summary?.late ?? 0}
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Attendance Log Table */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Chronological Session Log
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed breakdown of every lecture and lab session recorded
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {data.history?.length || 0} Records
              </span>
            </div>

            {data.history?.length === 0 ? (
              <div className="p-12 text-center">
                <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  No Sessions Logged Yet
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Once your teachers begin taking attendance for your class, the records will show here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Class & Section</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                    {data.history.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                          {rec.date}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                          {rec.class} — Sec {rec.section}
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
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {rec.teacher}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {rec.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      ) : null}
    </div>
  );
};
