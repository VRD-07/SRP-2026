import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  History,
  Bookmark,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { StatCard } from '../../components/shared/StatCard';
import { libraryService, StudentLibrarySummary } from '../../services/libraryService';

export const StudentLibraryPage: React.FC = () => {
  const [libraryData, setLibraryData] = useState<StudentLibrarySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await libraryService.getMyBooks();
      if (res.success && res.data) {
        setLibraryData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load personal library records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const formatCurrency = (val?: number | null) => {
    return `₹${(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-extrabold text-charcoal  tracking-tight flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-indigo-500" />
          My Library Account
        </h1>
        <p className="text-xs sm:text-sm text-muted  mt-1">
          Track your borrowed books, upcoming return deadlines, and library fines.
        </p>
      </div>

      {isLoading ? (
        <div className="p-20 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted font-medium">Fetching library loan records...</p>
        </div>
      ) : error ? (
        <GlassCard className="p-8 text-center border-rose-500/30">
          <AlertCircle className="w-10 h-10 text-terracotta mx-auto mb-2" />
          <h3 className="text-base font-bold text-charcoal ">Record Unavailable</h3>
          <p className="text-xs text-muted mt-1">{error}</p>
        </GlassCard>
      ) : (
        <>
          {/* Overdue Warning Alert */}
          {libraryData && libraryData.overdueIssuesCount > 0 && (
            <div className="p-4 rounded-2xl bg-terracotta/15 border border-terracotta/30 flex items-center justify-between gap-4 text-terracotta ">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-terracotta animate-pulse" />
                <div>
                  <p className="text-sm font-bold">
                    You have {libraryData.overdueIssuesCount} overdue book(s)!
                  </p>
                  <p className="text-xs opacity-90">
                    Outstanding library fines: {formatCurrency(libraryData.totalPendingFines)}. Please return books to the circulation desk promptly to avoid higher fines.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Books Currently Borrowed"
              value={libraryData?.activeIssuesCount ?? 0}
              subtitle="Active loans in your possession"
              icon={<BookOpen className="w-5 h-5" />}
              variant="indigo"
            />
            <StatCard
              title="Overdue Books"
              value={libraryData?.overdueIssuesCount ?? 0}
              subtitle="Accruing ₹2.00 / day late fine"
              icon={<Clock className="w-5 h-5" />}
              variant={libraryData && libraryData.overdueIssuesCount > 0 ? 'rose' : 'emerald'}
            />
            <StatCard
              title="Pending Library Fines"
              value={formatCurrency(libraryData?.totalPendingFines)}
              subtitle="Payable at Clerk Circulation Desk"
              icon={<CreditCard className="w-5 h-5" />}
              variant={libraryData && libraryData.totalPendingFines > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              title="Total Fines Paid / Cleared"
              value={formatCurrency(libraryData?.totalPaidFines)}
              subtitle="Historical settled dues"
              icon={<CheckCircle2 className="w-5 h-5" />}
              variant="cyan"
            />
          </div>

          {/* Active Borrowed Books */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-500" />
                Currently Borrowed Books
              </h3>
              <span className="text-xs text-muted font-mono">
                Standard Loan Period: 14 Days
              </span>
            </div>

            {!libraryData?.activeIssues || libraryData.activeIssues.length === 0 ? (
              <div className="p-10 text-center text-muted text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                You have no active book loans. Visit the campus library to check out titles!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                      <th className="py-3.5 px-4">Title & Author</th>
                      <th className="py-3.5 px-4">ISBN</th>
                      <th className="py-3.5 px-4">Issued On</th>
                      <th className="py-3.5 px-4">Scheduled Due Date</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Accrued Fine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-500/10  text-sm">
                    {libraryData.activeIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className="hover:bg-white/60  transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-charcoal ">{issue.title}</p>
                          <p className="text-xs text-muted">{issue.author} • {issue.category}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-muted">{issue.isbn}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-muted ">
                          {new Date(issue.issueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono font-semibold">
                          <span className={issue.isOverdue ? 'text-terracotta' : 'text-charcoal '}>
                            {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <GlassBadge
                            variant={issue.isOverdue ? 'danger' : 'success'}
                            size="sm"
                          >
                            {issue.isOverdue ? `${issue.daysOverdue} Days Overdue` : 'Active Loan'}
                          </GlassBadge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-terracotta ">
                          {formatCurrency(issue.accruedFine)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Borrowing History */}
          {libraryData?.history && libraryData.history.length > 0 && (
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-olive-500/15  flex items-center justify-between">
                <h3 className="text-sm font-bold text-charcoal  uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-muted" />
                  Loan History & Returns
                </h3>
                <span className="text-xs text-muted font-mono">
                  {libraryData.history.length} Completed Returns
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-olive-500/15  bg-olive-50/70  text-xs font-semibold uppercase tracking-wider text-muted ">
                      <th className="py-3 px-4">Book Title</th>
                      <th className="py-3 px-4">Borrowed On</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Returned On</th>
                      <th className="py-3 px-4 text-center">Fine Status</th>
                      <th className="py-3 px-4 text-right">Fine Settled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-olive-500/10  text-sm">
                    {libraryData.history.map((hist) => (
                      <tr key={hist.id} className="hover:bg-white/60  transition-colors">
                        <td className="py-3 px-4 font-medium text-charcoal ">
                          {hist.title}
                          <span className="block text-[11px] text-muted">{hist.author}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-muted">
                          {new Date(hist.issueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-muted">
                          {new Date(hist.dueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-muted">
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
                            <span className="text-xs text-muted">No fine</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-charcoal ">
                          {hist.fineAmount ? formatCurrency(hist.fineAmount) : '₹0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
};
