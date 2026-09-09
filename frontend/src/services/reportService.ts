import { apiRequest, triggerFileDownload } from './api';
import { StudentFeeSummary } from './studentService';

export interface ReportKPIs {
  totalAssigned: number;
  totalCollected: number;
  totalPending: number;
  totalReversedAmount: number;
  collectionRatePercentage: number;
  totalStudents: number;
  studentsWithDues: number;
}

export interface OverviewReportData {
  kpis: ReportKPIs;
  feeHeadDistribution: Array<{
    head: string;
    assigned: number;
    collected: number;
    pending: number;
  }>;
  classDistribution: Array<{
    className: string;
    assigned: number;
    collected: number;
    pending: number;
  }>;
  timelineTrends: Array<{
    date: string;
    amount: number;
  }>;
}

export const reportService = {
  getOverview: (params?: {
    academicYear?: string;
    class?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return apiRequest<{ success: boolean; data: OverviewReportData }>('/reports/overview', { params });
  },

  getPendingDues: (params?: { class?: string; search?: string }) => {
    return apiRequest<{ success: boolean; data: StudentFeeSummary[] }>('/reports/dues', { params });
  },

  exportCsv: async (params?: { class?: string; startDate?: string; endDate?: string; status?: string }) => {
    const blob = await apiRequest<Blob>('/reports/export-csv', { params });
    const today = new Date().toISOString().split('T')[0];
    triggerFileDownload(blob, `Fee_Collection_Report_${today}.csv`);
  },
};
