import { apiRequest, triggerFileDownload } from './api';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  addedAt: string;
  updatedAt: string;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issuedByUserId: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
  fineAmount?: number | null;
  fineStatus?: 'PENDING' | 'PAID' | 'WAIVED' | null;
  finePaidAt?: string | null;
  fineWaivedAt?: string | null;
  notes?: string | null;
  book?: Book;
  student?: {
    id: string;
    rollNumber: string;
    name: string;
    class: string;
    section: string;
  };
  issuedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StudentLibrarySummary {
  activeIssuesCount: number;
  overdueIssuesCount: number;
  totalPendingFines: number;
  totalPaidFines: number;
  totalWaivedFines: number;
  activeIssues: Array<{
    id: string;
    bookId: string;
    title: string;
    author: string;
    isbn: string;
    category: string;
    issueDate: string;
    dueDate: string;
    isOverdue: boolean;
    daysOverdue: number;
    accruedFine: number;
    fineStatus: string | null;
  }>;
  history: Array<{
    id: string;
    bookId: string;
    title: string;
    author: string;
    isbn: string;
    issueDate: string;
    dueDate: string;
    returnDate: string | null;
    status: string;
    fineAmount: number | null;
    fineStatus: string | null;
  }>;
}

export interface LibraryReportsKPIs {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeIssues: number;
  overdueIssues: number;
  totalFinesCollected: number;
  totalFinesPending: number;
  totalFinesWaived: number;
}

export interface LibraryReportsData {
  kpis: LibraryReportsKPIs;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
  recentActivity: BookIssue[];
}

export const libraryService = {
  // Books Catalog
  getBooks: (params?: { search?: string; category?: string; availableOnly?: boolean }) => {
    return apiRequest<{ success: boolean; data: Book[] }>('/library/books', { params });
  },

  getBookById: (id: string) => {
    return apiRequest<{ success: boolean; data: Book }>(`/library/books/${id}`);
  },

  createBook: (data: {
    title: string;
    author: string;
    isbn: string;
    category: string;
    totalCopies: number;
    availableCopies?: number;
  }) => {
    return apiRequest<{ success: boolean; data: Book; message: string }>('/library/books', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateBook: (
    id: string,
    data: {
      title?: string;
      author?: string;
      isbn?: string;
      category?: string;
      totalCopies?: number;
      availableCopies?: number;
    }
  ) => {
    return apiRequest<{ success: boolean; data: Book; message: string }>(`/library/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteBook: (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/library/books/${id}`, {
      method: 'DELETE',
    });
  },

  // Circulation Desk
  issueBook: (data: { bookId: string; studentId: string; dueDate?: string }) => {
    return apiRequest<{ success: boolean; data: BookIssue; message: string }>('/library/issue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  returnBook: (issueId: string, data?: { notes?: string }) => {
    return apiRequest<{
      success: boolean;
      data: {
        issue: BookIssue;
        daysOverdue: number;
        fineAssessed: number;
        fineStatus: string | null;
      };
      message: string;
    }>(`/library/return/${issueId}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  payFine: (issueId: string) => {
    return apiRequest<{ success: boolean; data: BookIssue; message: string }>(
      `/library/issues/${issueId}/pay-fine`,
      {
        method: 'POST',
      }
    );
  },

  waiveFine: (issueId: string, reason: string) => {
    return apiRequest<{ success: boolean; data: BookIssue; message: string }>(
      `/library/issues/${issueId}/waive-fine`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  // Overdue Tracking & Reports
  getOverdueIssues: () => {
    return apiRequest<{ success: boolean; data: BookIssue[] }>('/library/overdue');
  },

  getReports: () => {
    return apiRequest<{ success: boolean; data: LibraryReportsData }>('/library/reports');
  },

  exportCSV: async () => {
    const blob = await apiRequest<Blob>('/library/export');
    triggerFileDownload(blob, `library-circulation-report-${Date.now()}.csv`);
  },

  // Student Self-Service
  getMyBooks: () => {
    return apiRequest<{ success: boolean; data: StudentLibrarySummary }>('/library/my-books');
  },

  getStudentSummary: (studentId: string) => {
    return apiRequest<{ success: boolean; data: StudentLibrarySummary }>(
      `/library/students/${studentId}/summary`
    );
  },
};
