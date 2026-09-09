import { apiRequest } from './api';

export interface FeeStructure {
  id: string;
  class: string;
  batch: string;
  academicYear: string;
  feeHead: 'Tuition' | 'Hostel' | 'Transport' | 'Exam' | 'LateFee' | 'Other';
  amount: number;
  dueDate: string;
  createdAt: string;
  _count?: {
    feeAssignments: number;
  };
}

export const feeService = {
  getAll: (params?: { class?: string; batch?: string; academicYear?: string }) => {
    return apiRequest<{ success: boolean; data: FeeStructure[] }>('/fee-structures', { params });
  },

  getById: (id: string) => {
    return apiRequest<{ success: boolean; data: FeeStructure }>(`/fee-structures/${id}`);
  },

  create: (data: Omit<FeeStructure, 'id' | 'createdAt' | '_count'>) => {
    return apiRequest<{ success: boolean; message: string; data: FeeStructure }>('/fee-structures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: string, data: Partial<FeeStructure>) => {
    return apiRequest<{ success: boolean; message: string; data: FeeStructure }>(`/fee-structures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/fee-structures/${id}`, {
      method: 'DELETE',
    });
  },
};
