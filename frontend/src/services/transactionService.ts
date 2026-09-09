import { apiRequest, triggerFileDownload } from './api';

export interface Transaction {
  id: string;
  studentId: string;
  feeAssignmentId: string;
  amount: number;
  paymentMode: 'CASH' | 'CHEQUE' | 'DD' | 'ONLINE_PLACEHOLDER';
  referenceNumber: string;
  recordedByClerkId: string;
  receiptNumber: string;
  status: 'SUCCESS' | 'REVERSED';
  reversalOfTransactionId?: string | null;
  reversalReason?: string | null;
  createdAt: string;
  student: {
    id: string;
    name: string;
    rollNumber: string;
    class: string;
    batch: string;
  };
  feeAssignment: {
    feeStructure: {
      feeHead: string;
      amount: number;
      academicYear: string;
    };
  };
  recordedByClerk: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  reversedBy?: {
    id: string;
    receiptNumber: string;
    createdAt: string;
    reversalReason?: string;
  } | null;
  reversalOf?: {
    id: string;
    receiptNumber: string;
    amount: number;
    createdAt: string;
  } | null;
}

export const transactionService = {
  getAll: (params?: {
    studentId?: string;
    rollNumber?: string;
    receiptNumber?: string;
    clerkId?: string;
    status?: 'SUCCESS' | 'REVERSED';
    startDate?: string;
    endDate?: string;
    myRecordsOnly?: boolean;
  }) => {
    return apiRequest<{ success: boolean; data: Transaction[] }>('/transactions', { params });
  },

  getById: (id: string) => {
    return apiRequest<{ success: boolean; data: Transaction }>(`/transactions/${id}`);
  },

  recordPayment: (data: {
    studentId: string;
    feeAssignmentId: string;
    amount: number;
    paymentMode: 'CASH' | 'CHEQUE' | 'DD' | 'ONLINE_PLACEHOLDER';
    referenceNumber: string;
    allowOverpaymentOverride?: boolean;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: Transaction }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  reverse: (id: string, reversalReason: string) => {
    return apiRequest<{ success: boolean; message: string; data: Transaction }>(`/transactions/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reversalReason }),
    });
  },

  downloadReceipt: async (transactionId: string, receiptNumber: string) => {
    const blob = await apiRequest<Blob>(`/transactions/${transactionId}/receipt`);
    triggerFileDownload(blob, `Receipt_${receiptNumber}.pdf`);
  },
};
