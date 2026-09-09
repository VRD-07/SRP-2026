import { apiRequest } from './api';

export interface ClerkUser {
  id: string;
  name: string;
  email: string;
  role: 'CLERK';
  isActive: boolean;
  createdAt: string;
  _count: {
    recordedTransactions: number;
  };
}

export const clerkService = {
  getAll: () => {
    return apiRequest<{ success: boolean; data: ClerkUser[] }>('/clerks');
  },

  create: (data: { name: string; email: string; password: string }) => {
    return apiRequest<{ success: boolean; message: string; data: ClerkUser }>('/clerks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  toggleStatus: (id: string) => {
    return apiRequest<{ success: boolean; message: string; data: { id: string; isActive: boolean } }>(
      `/clerks/${id}/toggle`,
      {
        method: 'PATCH',
      }
    );
  },

  resetPassword: (id: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/clerks/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
};
