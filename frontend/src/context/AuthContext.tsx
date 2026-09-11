import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

export type UserRole = 'ADMIN' | 'CLERK' | 'STUDENT' | 'TEACHER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string | null;
  studentRollNumber?: string | null;
  teacherId?: string | null;
  employeeId?: string | null;
  classesAssigned?: Array<{ class: string; section: string }> | null;
  subjectsTaught?: string[] | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('aura_erp_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = () => {
    localStorage.removeItem('aura_erp_token');
    localStorage.removeItem('aura_erp_user');
    setToken(null);
    setUser(null);
  };

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('aura_erp_token', newToken);
    localStorage.setItem('aura_erp_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('aura_erp_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; data: any }>('/auth/me');
      if (res.data) {
        const u = res.data;
        const mappedUser: AuthUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          studentId: u.student?.id || null,
          studentRollNumber: u.student?.rollNumber || null,
          teacherId: u.teacher?.id || null,
          employeeId: u.teacher?.employeeId || null,
          classesAssigned: u.teacher?.classesAssigned || null,
          subjectsTaught: u.teacher?.subjectsTaught || null,
        };
        setUser(mappedUser);
        localStorage.setItem('aura_erp_user', JSON.stringify(mappedUser));
      }
    } catch (err) {
      console.error('Session validation failed:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('aura_erp_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore parse error
      }
    }
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
