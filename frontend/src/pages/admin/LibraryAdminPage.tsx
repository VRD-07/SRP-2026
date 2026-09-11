import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  ArrowRightLeft,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  X,
  ShieldCheck,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassBadge } from '../../components/ui/GlassBadge';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatCard } from '../../components/shared/StatCard';
import { libraryService, Book, BookIssue, LibraryReportsData } from '../../services/libraryService';
import { studentService, StudentListItem } from '../../services/studentService';

export const LibraryAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'circulation' | 'overdue' | 'analytics'>('catalog');
  const [books, setBooks] = useState<Book[]>([]);
  const [overdueList, setOverdueList] = useState<BookIssue[]>([]);
  const [reports, setReports] = useState<LibraryReportsData | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<BookIssue | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  // Form states
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'Computer Science',
    totalCopies: 5,
  });

  const [issueForm, setIssueForm] = useState({
    bookId: '',
    studentId: '',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [booksRes, overdueRes, reportsRes, studentsRes] = await Promise.all([
        libraryService.getBooks(),
        libraryService.getOverdueIssues(),
        libraryService.getReports(),
        studentService.getAll(),
      ]);

      if (booksRes.success) setBooks(booksRes.data);
      if (overdueRes.success) setOverdueList(overdueRes.data);
      if (reportsRes.success) setReports(reportsRes.data);
      if (studentsRes.success) setStudents(studentsRes.data);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to fetch library information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await libraryService.createBook(newBook);
      if (res.success) {
        showNotification('success', `"${newBook.title}" added to catalog successfully.`);
        setIsAddBookOpen(false);
        setNewBook({ title: '', author: '', isbn: '', category: 'Computer Science', totalCopies: 5 });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to add book');
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from catalog?`)) return;
    try {
      const res = await libraryService.deleteBook(id);
      if (res.success) {
        showNotification('success', 'Book removed from library catalog.');
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Cannot delete book with active loans');
    }
  };

  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.bookId || !issueForm.studentId) {
      showNotification('error', 'Please select both a student and a book.');
      return;
    }
    try {
      const res = await libraryService.issueBook(issueForm);
      if (res.success) {
        showNotification('success', 'Book successfully issued to student!');
        setIsIssueModalOpen(false);
        setIssueForm({
          bookId: '',
          studentId: '',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to issue book');
    }
  };

  const handleReturnBook = async (issueId: string) => {
    try {
      const res = await libraryService.returnBook(issueId);
      if (res.success) {
        const fineText =
          res.data.fineAssessed > 0
            ? ` Overdue fine assessed: ₹${res.data.fineAssessed.toFixed(2)} (${res.data.daysOverdue} days).`
            : ' Returned on time with zero fine.';
        showNotification('success', `Book checked in successfully!${fineText}`);
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Return check-in failed');
    }
  };

  const handleWaiveFine = async () => {
    if (!selectedIssue || !waiveReason.trim()) {
      showNotification('error', 'Please provide an administrative justification for waiver.');
      return;
    }
    try {
      const res = await libraryService.waiveFine(selectedIssue.id, waiveReason.trim());
      if (res.success) {
        showNotification('success', `Fine of ₹${(selectedIssue.fineAmount || 0).toFixed(2)} waived by Administrator.`);
        setIsWaiveModalOpen(false);
        setSelectedIssue(null);
        setWaiveReason('');
        loadData();
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Waiver failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      await libraryService.exportCSV();
      showNotification('success', 'Library report downloaded successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Export failed');
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? b.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(books.map((b) => b.category)));
  const kpis = reports?.kpis;

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
            <BookOpen className="w-7 h-7 text-indigo-500" />
            Library & Circulation Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete institutional repository: Book catalog, circulation desk, overdue fines, and analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <GlassButton
            variant="secondary"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
          >
            Export CSV
          </GlassButton>
          <GlassButton
            variant="secondary"
            onClick={() => setIsIssueModalOpen(true)}
            leftIcon={<ArrowRightLeft className="w-4 h-4 text-indigo-500" />}
          >
            Issue Book
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={() => setIsAddBookOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Title
          </GlassButton>
        </div>
      </div>

      {/* Institutional KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Catalog Titles"
          value={kpis?.totalTitles ?? books.length}
          subtitle={`${kpis?.totalCopies ?? 0} Total physical copies`}
          icon={<BookOpen className="w-5 h-5" />}
          variant="indigo"
        />
        <StatCard
          title="Active Loans"
          value={kpis?.activeIssues ?? 0}
          subtitle={`${kpis?.availableCopies ?? 0} Copies on shelf`}
          icon={<ArrowRightLeft className="w-5 h-5" />}
          variant="cyan"
        />
        <StatCard
          title="Overdue Books"
          value={kpis?.overdueIssues ?? overdueList.length}
          subtitle="Late returns accruing fines"
          icon={<Clock className="w-5 h-5" />}
          variant="amber"
        />
        <StatCard
          title="Total Fines Collected"
          value={`₹ ${(kpis?.totalFinesCollected ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`₹ ${(kpis?.totalFinesPending ?? 0).toLocaleString('en-IN')} pending`}
          icon={<CreditCard className="w-5 h-5" />}
          variant="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Book Catalog ({filteredBooks.length})
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
          Overdue & Fine Management
          {overdueList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {overdueList.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Recent Activity & Audit
        </button>
      </div>

      {/* TAB 1: CATALOG */}
      {activeTab === 'catalog' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 rounded-xl text-xs bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Title & Author</th>
                  <th className="py-3 px-4">ISBN</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Available / Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                {filteredBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 dark:text-white">{b.title}</p>
                      <p className="text-xs text-slate-500">{b.author}</p>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">{b.isbn}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold">
                      <span className={b.availableCopies > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                        {b.availableCopies}
                      </span>
                      <span className="text-slate-400"> / {b.totalCopies}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <GlassBadge variant={b.availableCopies > 0 ? 'success' : 'danger'} size="sm">
                        {b.availableCopies > 0 ? 'In Stock' : 'Out of Stock'}
                      </GlassBadge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIssueForm((prev) => ({ ...prev, bookId: b.id }));
                            setIsIssueModalOpen(true);
                          }}
                          disabled={b.availableCopies <= 0}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Issue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBook(b.id, b.title)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete title"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* TAB 2: OVERDUE & FINE MANAGEMENT */}
      {activeTab === 'overdue' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Overdue Loans & Fine Settlement
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory fine accrual rate: ₹2.00 per calendar day beyond scheduled return.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {overdueList.length} Accounts Pending Clearance
            </span>
          </div>

          {overdueList.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All library loans are currently in good standing. Zero overdue books!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Fine Accrued</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                  {overdueList.map((issue) => (
                    <tr key={issue.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 dark:text-white">
                          {issue.student?.name}
                        </p>
                        <p className="text-xs font-mono text-slate-400">
                          {issue.student?.rollNumber} • {issue.student?.class}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {issue.book?.title}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{issue.book?.isbn}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-rose-500 font-semibold">
                        {new Date(issue.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <GlassBadge variant="danger" size="sm">
                          OVERDUE
                        </GlassBadge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{(issue.fineAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleReturnBook(issue.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                          >
                            Return Book
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setIsWaiveModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100"
                          >
                            Waive Fine
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* TAB 3: AUDIT & RECENT ACTIVITY */}
      {activeTab === 'analytics' && (
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Recent Circulation History & Institutional Audit
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Live Ledger Synchronization
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Fine Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-white/5 text-sm">
                {reports?.recentActivity?.slice(0, 15).map((act) => (
                  <tr key={act.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                      {act.student?.name}
                      <span className="block text-[11px] font-mono text-slate-400">
                        {act.student?.rollNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {act.book?.title}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(act.issueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {new Date(act.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {act.returnDate ? new Date(act.returnDate).toLocaleDateString('en-IN') : 'Active Loan'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <GlassBadge
                        variant={
                          act.status === 'RETURNED'
                            ? 'success'
                            : act.status === 'OVERDUE'
                            ? 'danger'
                            : 'info'
                        }
                        size="sm"
                      >
                        {act.status}
                      </GlassBadge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">
                      {act.fineStatus ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{(act.fineAmount || 0).toFixed(2)} ({act.fineStatus})
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* MODAL: ADD NEW BOOK */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Add New Book to Catalog
              </h2>
              <button
                type="button"
                onClick={() => setIsAddBookOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  placeholder="e.g. Introduction to Algorithms"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Author *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    placeholder="e.g. Cormen, Leiserson"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ISBN *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    placeholder="e.g. 978-0262033848"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                    placeholder="e.g. Data Structures"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Copies *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newBook.totalCopies}
                    onChange={(e) => setNewBook({ ...newBook, totalCopies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                <GlassButton variant="secondary" onClick={() => setIsAddBookOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="primary" type="submit">
                  Save Title
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL: ISSUE BOOK */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                Circulation Desk: Issue Book
              </h2>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={issueForm.studentId}
                  onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber} - {s.class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Book from Catalog *
                </label>
                <select
                  required
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  <option value="">-- Choose Book --</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.availableCopies <= 0}>
                      {b.title} by {b.author} ({b.availableCopies} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                <GlassButton variant="secondary" onClick={() => setIsIssueModalOpen(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="primary" type="submit">
                  Confirm Issue
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {/* MODAL: WAIVE FINE (ADMIN EXCLUSIVE) */}
      {isWaiveModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-500" />
                Administrative Fine Waiver
              </h2>
              <button
                type="button"
                onClick={() => setIsWaiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-500/20">
                <p className="font-semibold text-slate-800 dark:text-white">
                  Student: {selectedIssue.student?.name} ({selectedIssue.student?.rollNumber})
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Book: {selectedIssue.book?.title}
                </p>
                <p className="text-rose-600 dark:text-rose-400 font-bold mt-1">
                  Outstanding Fine: ₹{(selectedIssue.fineAmount || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Administrative Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Hospitalization medical certificate authorized by Vice Chancellor"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
              <GlassButton variant="secondary" onClick={() => setIsWaiveModalOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="primary" onClick={handleWaiveFine}>
                Authorize Waiver
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
