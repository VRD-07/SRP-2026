import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  History,
  BookOpen,
  Users,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { useAuth } from '../../context/AuthContext';
import { teacherService, ClassSectionAssignment } from '../../services/teacherService';
import { attendanceService } from '../../services/attendanceService';

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ClassSectionAssignment[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherInfo = async () => {
      try {
        setLoading(true);
        const res = await teacherService.getMyAssignments();
        if (res.success && res.data) {
          setAssignments(res.data.classesAssigned || []);
          setSubjects(res.data.subjectsTaught || []);
        }
      } catch (err) {
        console.error('Failed to load teacher assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherInfo();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Card */}
      <GlassCard className="p-6 sm:p-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border-emerald-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Faculty Portal • {user?.employeeId || 'Instructor'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome back, {user?.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Department of Computer Science & Academic Affairs • Institutional Attendance System
            </p>
          </div>

          <div className="flex gap-2">
            <GlassButton
              variant="primary"
              onClick={() => navigate('/teacher/mark')}
              leftIcon={<CalendarCheck className="w-4 h-4" />}
            >
              Mark Today's Attendance
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Subjects Taught Banner */}
      {subjects.length > 0 && (
        <GlassCard className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Curriculum Subjects Handled</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {subjects.map((sub, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-slate-200/50 dark:border-white/5"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Assigned Classes Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Authorized Classes & Rosters
          </h3>
          <span className="text-xs text-slate-500">
            {assignments.length} Assigned Sections
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((item, idx) => (
            <GlassCard
              key={idx}
              className="p-5 hover:border-indigo-500/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <GlassBadge variant="cyan" size="sm">
                    Section {item.section}
                  </GlassBadge>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {item.class}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Section {item.section} • Daily Attendance Boundary
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                <button
                  onClick={() =>
                    navigate(`/teacher/mark?class=${encodeURIComponent(item.class)}&section=${encodeURIComponent(item.section)}`)
                  }
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Mark Attendance <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard
          className="p-5 cursor-pointer hover:border-indigo-500/40 transition-all"
          onClick={() => navigate('/teacher/mark')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Take Daily Roll Call
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Load active student roster, mark Present/Absent/Late, and submit session
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard
          className="p-5 cursor-pointer hover:border-indigo-500/40 transition-all"
          onClick={() => navigate('/teacher/history')}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Review Past Sessions
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse previously recorded attendance sessions, filter by date, or make corrections
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
