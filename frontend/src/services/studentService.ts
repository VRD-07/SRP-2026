import { apiRequest } from './api';

export interface FeeHeadBreakdown {
  feeAssignmentId: string;
  feeStructureId: string;
  feeHead: string;
  class: string;
  batch: string;
  academicYear: string;
  assignedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  isOverdue: boolean;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
}

export interface StudentFeeSummary {
  studentId: string;
  rollNumber: string;
  name: string;
  class: string;
  batch: string;
  totalAssigned: number;
  totalPaid: number;
  totalPending: number;
  totalReversals: number;
  nextDueDate: string | null;
  hasOverdue: boolean;
  heads: FeeHeadBreakdown[];
}

export interface StudentListItem {
  id: string;
  userId: string;
  rollNumber: string;
  name: string;
  class: string;
  batch: string;
  admissionYear: number;
  contactNumber: string;
  email: string;
  isActive: boolean;
  totalAssigned: number;
  totalPaid: number;
  totalPending: number;
  feeAssignmentsCount: number;
}

export interface StudentDetail {
  student: {
    id: string;
    userId: string;
    rollNumber: string;
    name: string;
    class: string;
    batch: string;
    admissionYear: number;
    contactNumber: string;
    user: { email: string; isActive: boolean };
    transactions: any[];
  };
  summary: StudentFeeSummary;
}

export const studentService = {
  getAll: (params?: { search?: string; class?: string }) => {
    return apiRequest<{ success: boolean; data: StudentListItem[] }>('/students', { params });
  },

  getById: (id: string) => {
    return apiRequest<{ success: boolean; data: StudentDetail }>(`/students/${id}`);
  },

  create: (data: {
    name: string;
    email: string;
    rollNumber: string;
    class: string;
    batch: string;
    admissionYear: number;
    contactNumber: string;
    password?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<StudentListItem>) => {
    return apiRequest<{ success: boolean; message: string }>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  assignFeeStructures: (studentId: string, feeStructureIds: string[]) => {
    return apiRequest<{ success: boolean; message: string; data: StudentFeeSummary }>(
      `/students/${studentId}/assignments`,
      {
        method: 'POST',
        body: JSON.stringify({ feeStructureIds }),
      }
    );
  },

  getMyProfile: () => {
    return apiRequest<{
      success: boolean;
      data: {
        student: any;
        summary: StudentFeeSummary;
        transactions: any[];
      };
    }>('/students/me');
  },
};
