import { apiRequest } from './api';

export interface AttendanceRecordItem {
  id?: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  remarks?: string | null;
}

export interface AttendanceRosterStudent {
  id: string;
  rollNumber: string;
  name: string;
  photoUrl?: string | null;
  status: string;
}

export interface AttendanceRosterResponse {
  date: string;
  class: string;
  section: string;
  students: AttendanceRosterStudent[];
  isAlreadyMarked: boolean;
  existingSession: {
    id: string;
    date: string;
    markedBy: string;
    records: Array<{
      id: string;
      studentId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE';
      remarks?: string | null;
    }>;
  } | null;
}

export interface AttendanceSessionListItem {
  id: string;
  class: string;
  section: string;
  date: string;
  markedBy: string;
  markedByTeacherId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
}

export interface AdminAttendanceReportRow {
  studentId: string;
  rollNumber: string;
  name: string;
  class: string;
  section: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

export interface StudentSelfAttendance {
  student: {
    id: string;
    name: string;
    rollNumber: string;
    class: string;
    section: string;
  };
  summary: {
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
  history: Array<{
    id: string;
    date: string;
    class: string;
    section: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
    remarks?: string | null;
    teacher: string;
  }>;
}

export const attendanceService = {
  getRoster: (params: { class: string; section: string; date?: string }) => {
    return apiRequest<{ success: boolean; data: AttendanceRosterResponse }>('/attendance/roster', {
      params,
    });
  },

  markAttendance: (data: {
    class: string;
    section: string;
    date: string;
    subjectId?: string;
    records: AttendanceRecordItem[];
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getSessions: (params?: {
    class?: string;
    section?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return apiRequest<{ success: boolean; data: AttendanceSessionListItem[] }>(
      '/attendance/sessions',
      { params }
    );
  },

  getSessionById: (id: string) => {
    return apiRequest<{ success: boolean; data: any }>(`/attendance/sessions/${id}`);
  },

  updateSession: (sessionId: string, records: AttendanceRecordItem[]) => {
    return apiRequest<{ success: boolean; message: string }>(`/attendance/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ records }),
    });
  },

  getAdminReports: (params?: {
    class?: string;
    section?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return apiRequest<{ success: boolean; data: AdminAttendanceReportRow[] }>(
      '/attendance/reports',
      { params }
    );
  },

  exportAdminReportsCsv: (params?: {
    class?: string;
    section?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return apiRequest<Blob>('/attendance/reports/export', { params });
  },

  getMyAttendance: () => {
    return apiRequest<{ success: boolean; data: StudentSelfAttendance }>(
      '/attendance/my-attendance'
    );
  },
};
