import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Percent,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassInput } from '../../components/ui/GlassInput';
import { GlassSelect } from '../../components/ui/GlassSelect';
import { GlassTable, Column } from '../../components/ui/GlassTable';
import {
  attendanceService,
  AdminAttendanceReportRow,
} from '../../services/attendanceService';
import { triggerFileDownload } from '../../services/api';

export const AttendanceReportsPage: React.FC = () => {
  const [reports, setReports] = useState<AdminAttendanceReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminReports({
        class: filterClass || undefined,
        section: filterSection || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.success) setReports(res.data);
    } catch (err) {
      console.error('Failed to load attendance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterClass, filterSection]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const blob = await attendanceService.exportAdminReportsCsv({
        class: filterClass || undefined,
        section: filterSection || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      triggerFileDownload(blob, `Attendance-Report-${filterClass || 'All'}-${Date.now()}.csv`);
    } catch (err: any) {
      alert(`CSV Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Aggregated KPIs
  const totalStudents = reports.length;
  const avgAttendance =
    totalStudents > 0
      ? Math.round(
          (reports.reduce((acc, curr) => acc + curr.percentage, 0) / totalStudents) * 10
        ) / 10
      : 100;
  const lowAttendanceCount = reports.filter((r) => r.percentage < 75).length;

  const columns: Column<AdminAttendanceReportRow>[] = [
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
          <span className="text-[11px] text-slate-500">
            {item.class} • Sec {item.section}
          </span>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Sessions',
      render: (item) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {item.total} classes
        </span>
      ),
    },
    {
      key: 'present',
      header: 'Present / Absent / Late',
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.present} P</span>
          <span className="text-slate-400">•</span>
          <span className="font-bold text-rose-600 dark:text-rose-400">{item.absent} A</span>
          <span className="text-slate-400">•</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">{item.late} L</span>
        </div>
      ),
    },
    {
      key: 'percentage',
      header: 'Attendance %',
      render: (item) => {
        const isLow = item.percentage < 75;
        return (
          <div className="space-y-1 w-36">
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-black ${
                  isLow
                    ? 'text-rose-600 dark:text-rose-400'
                    : item.percentage >= 85
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {item.percentage}%
              </span>
              {isLow && (
                <GlassBadge variant="danger" size="sm">
                  &lt;75%
                </GlassBadge>
              )}
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  isLow
                    ? 'bg-rose-500'
                    : item.percentage >= 85
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, item.percentage)}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Attendance Reports
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aggregated attendance statistics across all classes and sections with CSV export capabilities
          </p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleExportCsv}
          isLoading={exporting}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV Report
        </GlassButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Students Tracked</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {totalStudents}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Overall Average Attendance</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {avgAttendance}%
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Shortage Notice (&lt;75%)</p>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              {lowAttendanceCount} Students
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            ]}
          />

          <GlassInput
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <GlassInput
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="flex items-end">
            <GlassButton variant="secondary" type="submit" className="w-full">
              Apply Filters
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {/* Reports Table */}
      <GlassTable
        keyExtractor={(row) => row.studentId}
        columns={columns}
        data={reports}
        isLoading={loading}
        emptyMessage="No attendance data matches your selected filters."
      />
    </div>
  );
};
