import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  CreditCard,
  User,
  X,
  Receipt,
  FileCheck2,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatCard } from '../../components/shared/StatCard';
import { libraryService, Book, BookIssue } from '../../services/libraryService';
import { studentService, StudentListItem } from '../../services/studentService';

export const LibraryCirculationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'issue' | 'return' | 'overdue'>('issue');
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [overdueList, setOverdueList] = useState<BookIssue[]>([]);
  const [activeIssues, setActiveIssues] = useState<BookIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search filters
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [returnSearch, setReturnSearch] = useState('');

  // Selected for issue
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Notification / Receipt states
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [settledIssue, setSettledIssue] = useState<BookIssue | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, studentsRes, overdueRes, reportsRes] = await Promise.all([
        libraryService.getBooks(),
        studentService.getAll(),
        libraryService.getOverdueIssues(),
        libraryService.getReports(),
      ]);

      if (booksRes.success) setBooks(booksRes.data);
      if (studentsRes.success) setStudents(studentsRes.data);
      if (overdueRes.success) setOverdueList(overdueRes.data);
      if (reportsRes.success) {
        setActiveIssues(reportsRes.data.recentActivity.filter((a) => a.status !== 'RETURNED'));
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch circulation desk data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmIssue = async () => {
    if (!selectedStudent || !selectedBook) {
      showNotification('error', 'Please select both a student and a book.');
      return;
    }

    try {
      const res = await libraryService.issueBook({
        studentId: selectedStudent.id,
        bookId: selectedBook.id,
        dueDate,
      });

      if (res.success) {
        showNotification(
          'success',
          `Book "${selectedBook.title}" issued to ${selectedStudent.name} (Roll: ${selectedStudent.rollNumber}) successfully!`
        );
        setSelectedStudent(null);
        setSelectedBook(null);
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Book issue failed');
    }
  };

  const handleReturn = async (issueId: string) => {
    try {
      const res = await libraryService.returnBook(issueId);
      if (res.success) {
        const { fineAssessed, daysOverdue } = res.data;
        if (fineAssessed > 0) {
          showNotification(
            'success',
            `Book returned. ${daysOverdue} days overdue. Accrued fine: ₹${fineAssessed.toFixed(2)}.`
          );
        } else {
          showNotification('success', 'Book returned on time with zero fine assessed!');
        }
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Return check-in failed');
    }
  };

  const handlePayFine = async (issue: BookIssue) => {
    try {
      const res = await libraryService.payFine(issue.id);
      if (res.success) {
        showNotification('success', `Fine of ₹${(issue.fineAmount || 0).toFixed(2)} marked as PAID!`);
        setSettledIssue(res.data);
        setIsReceiptOpen(true);
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to record fine payment');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.class.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredBooks = books.filter(
    (b) =>
      (b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.isbn.toLowerCase().includes(bookSearch.toLowerCase())) &&
      b.availableCopies > 0
  );

  const filteredActiveIssues = activeIssues.filter(
    (i) =>
      (i.student?.name || '').toLowerCase().includes(returnSearch.toLowerCase()) ||
      (i.student?.rollNumber || '').toLowerCase().includes(returnSearch.toLowerCase()) ||
      (i.book?.title || '').toLowerCase().includes(returnSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="w-7 h-7 text-indigo-500" />
            Cashier Circulation Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Rapid student checkout, loan returns, and cash fine settlements.
          </p>
        </div>
      </div>

      {/* Circulation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Student Loans"
          value={activeIssues.length}
          subtitle="Books currently in circulation"
          icon={<BookOpen className="w-5 h-5" />}
          variant="indigo"
        />
        <StatCard
          title="Overdue Books"
          value={overdueList.length}
          subtitle="Loans past scheduled return"
          icon={<Clock className="w-5 h-5" />}
          variant="rose"
        />
        <StatCard
          title="Available Titles In Stock"
          value={filteredBooks.length}
          subtitle="Ready for immediate student checkout"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('issue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'issue'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Check-Out (Issue Book)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('return')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'return'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Check-In (Return Book)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'overdue'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Overdue Fines ({overdueList.length})
        </button>
      </div>

      {/* TAB 1: ISSUE BOOK */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Step 1: Select Student */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Step 1: Select Student
              </h3>
              {selectedStudent && (
                <GlassBadge variant="success" size="sm">
                  Selected: {selectedStudent.rollNumber}
                </GlassBadge>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name, roll number, or class..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {filteredStudents.slice(0, 8).map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                    selectedStudent?.id === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/40'
                      : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{s.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Roll: {s.rollNumber} • {s.class} ({s.section})
                    </p>
                  </div>
                  <GlassBadge variant={s.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                    {s.status}
                  </GlassBadge>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Step 2: Select Book & Confirm */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                Step 2: Select Book
              </h3>
              {selectedBook && (
                <GlassBadge variant="success" size="sm">
                  {selectedBook.availableCopies} in stock
                </GlassBadge>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search available books by title or author..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
              />
            </div>

            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {filteredBooks.slice(0, 8).map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBook(b)}
                  className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                    selectedBook?.id === b.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40'
                      : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{b.title}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {b.author} • ISBN: {b.isbn}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {b.availableCopies} left
                  </span>
                </div>
              ))}
            </div>

            {/* Due Date & Action */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Return Due Date:
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                />
              </div>

              <GlassButton
                variant="primary"
                onClick={handleConfirmIssue}
                disabled={!selectedStudent || !selectedBook}
                className="w-full justify-center"
              >
                Confirm Issue to Student
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* TAB 2: RETURN BOOK */}
      {activeTab === 'return' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search active loans by student name, roll number, or book..."
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                {filteredActiveIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 dark:text-white">{issue.student?.name}</p>
                      <p className="text-xs font-mono text-slate-400">
                        {issue.student?.rollNumber} • {issue.student?.class}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-700 dark:text-slate-200">{issue.book?.title}</p>
                      <p className="text-xs font-mono text-slate-500">{issue.book?.isbn}</p>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(issue.issueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <GlassBadge variant={issue.status === 'OVERDUE' ? 'danger' : 'success'} size="sm">
                        {issue.status}
                      </GlassBadge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleReturn(issue.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                      >
                        Check-In Book
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 3: OVERDUE FINES & COLLECTION */}
      {activeTab === 'overdue' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Cashier Desk: Collect Overdue Fines
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Rate: ₹2.00 / day
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Fine Amount</th>
                  <th className="py-3 px-4 text-center">Fine Status</th>
                  <th className="py-3 px-4 text-right">Cashier Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                {overdueList.map((issue) => (
                  <tr key={issue.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 dark:text-white">{issue.student?.name}</p>
                      <p className="text-xs font-mono text-slate-400">{issue.student?.rollNumber}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {issue.book?.title}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-rose-500">
                      {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      ₹{(issue.fineAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <GlassBadge variant={issue.fineStatus === 'PAID' ? 'success' : 'warning'} size="sm">
                        {issue.fineStatus || 'PENDING'}
                      </GlassBadge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {issue.fineStatus !== 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => handlePayFine(issue)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
                        >
                          Collect Fine (Cash)
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptOpen && settledIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Fine Payment Receipt
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/10 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Student:</span>
                <span className="text-slate-800 dark:text-white font-bold">{settledIssue.student?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Roll:</span>
                <span className="text-slate-800 dark:text-white">{settledIssue.student?.rollNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Book:</span>
                <span className="text-slate-800 dark:text-white">{settledIssue.book?.title}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-white/10 pt-2 font-bold text-sm">
                <span className="text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{(settledIssue.fineAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            <GlassButton variant="primary" onClick={() => setIsReceiptOpen(false)} className="w-full justify-center">
              Done / Close Receipt
            </GlassButton>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
