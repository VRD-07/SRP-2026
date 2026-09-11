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
  admissionNumber?: string | null;
  name: string;
  class: string;
  batch: string;
  section: string;
  admissionYear: number;
  admissionDate?: string | null;
  contactNumber: string;
  guardianName?: string | null;
  guardianContact?: string | null;
  guardianRelation?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  documentsSubmitted?: Record<string, boolean> | null;
  photoUrl?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED';
  email: string;
  isActive: boolean;
  totalAssigned: number;
  totalPaid: number;
  totalPending: number;
  feeAssignmentsCount: number;
}

export interface UnifiedStudentProfile {
  student: {
    id: string;
    userId: string;
    rollNumber: string;
    admissionNumber?: string | null;
    name: string;
    class: string;
    batch: string;
    section: string;
    admissionYear: number;
    admissionDate?: string | null;
    contactNumber: string;
    guardianName?: string | null;
    guardianContact?: string | null;
    guardianRelation?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    documentsSubmitted?: Record<string, boolean> | null;
    photoUrl?: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED';
    user: { email: string; isActive: boolean };
  };
  fees: StudentFeeSummary;
  attendance: {
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    percentage: number;
    recentRecords: Array<{
      id: string;
      date: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE';
      remarks?: string | null;
      markedBy: string;
      class: string;
      section: string;
    }>;
  };
  library?: import('./libraryService').StudentLibrarySummary;
}

export interface StudentDetail {
  student: {
    id: string;
    userId: string;
    rollNumber: string;
    name: string;
    class: string;
    batch: string;
    section: string;
    admissionYear: number;
    contactNumber: string;
    user: { email: string; isActive: boolean };
    transactions: any[];
  };
  summary: StudentFeeSummary;
}

export const studentService = {
  getAll: (params?: { search?: string; class?: string; section?: string; status?: string }) => {
    return apiRequest<{ success: boolean; data: StudentListItem[] }>('/students', { params });
  },

  getById: (id: string) => {
    return apiRequest<{ success: boolean; data: StudentDetail }>(`/students/${id}`);
  },

  getProfile: (id: string) => {
    return apiRequest<{ success: boolean; data: UnifiedStudentProfile }>(`/students/${id}/profile`);
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

  getMyUnifiedProfile: () => {
    return apiRequest<{ success: boolean; data: UnifiedStudentProfile }>('/students/me/profile');
  },

  create: (data: {
    name: string;
    email: string;
    rollNumber: string;
    admissionNumber?: string;
    class: string;
    batch: string;
    section?: string;
    admissionYear: number;
    admissionDate?: string;
    contactNumber: string;
    guardianName?: string;
    guardianContact?: string;
    guardianRelation?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    documentsSubmitted?: any;
    photoUrl?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED';
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

  updateStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'TRANSFERRED') => {
    return apiRequest<{ success: boolean; message: string }>(`/students/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
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
};
