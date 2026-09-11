import { apiRequest } from './api';

export interface ClassSectionAssignment {
  class: string;
  section: string;
}

export interface TeacherListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeId: string;
  subjectsTaught: string[];
  classesAssigned: ClassSectionAssignment[];
  isActive: boolean;
  createdAt: string;
}

export const teacherService = {
  getAll: (params?: { search?: string }) => {
    return apiRequest<{ success: boolean; data: TeacherListItem[] }>('/teachers', { params });
  },

  getById: (id: string) => {
    return apiRequest<{ success: boolean; data: TeacherListItem }>(`/teachers/${id}`);
  },

  create: (data: {
    name: string;
    email: string;
    employeeId: string;
    subjectsTaught: string[];
    classesAssigned: ClassSectionAssignment[];
    password?: string;
  }) => {
    return apiRequest<{ success: boolean; message: string; data: any }>('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (
    id: string,
    data: {
      name?: string;
      email?: string;
      employeeId?: string;
      subjectsTaught?: string[];
      classesAssigned?: ClassSectionAssignment[];
    }
  ) => {
    return apiRequest<{ success: boolean; message: string }>(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: (id: string, isActive: boolean) => {
    return apiRequest<{ success: boolean; message: string }>(`/teachers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  resetPassword: (id: string, newPassword: string) => {
    return apiRequest<{ success: boolean; message: string }>(`/teachers/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  getMyAssignments: () => {
    return apiRequest<{
      success: boolean;
      data: {
        id: string;
        employeeId: string;
        subjectsTaught: string[];
        classesAssigned: ClassSectionAssignment[];
      };
    }>('/teachers/me/assignments');
  },
};
