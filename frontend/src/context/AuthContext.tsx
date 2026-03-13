import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../api';

export type UserRole = 'DEV' | 'CEO' | 'ADMIN' | 'TEACHER';

export interface CurrentUser {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  role_display: string;
  status: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (access: string, refresh: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('access_token')
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Use the 'api' instance which has the base URL and refresh interceptors
      const res = await api.get('me/');
      setCurrentUser(res.data);
    } catch {
      // Interceptor handles refresh or logout
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchUser();
    else {
      setCurrentUser(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const login = (access: string, refresh: string) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const refreshUser = fetchUser;

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Permission Hook ──────────────────────────────────────────────────────────
export function usePermissions() {
  const { currentUser, loading } = useAuth();
  
  // While loading, we should be careful not to return "guest" perms if they might be a CEO
  // But for sidebar visibility, let's assume "nothing" until loaded
  const role = currentUser?.role;

  // If we don't have a user yet, we are effectively a "Guest" or "Loading"
  if (!currentUser) {
    return {
      role: null,
      isCEO: false, isAdmin: false, isTeacher: false,
      canViewFinancialStats: false, canViewFinanceDebt: false, canChargeStudents: false,
      canEditStudents: false, canEditLeads: false, canEditClasses: false,
      canManageStaff: false, canChangeStaffStatus: false,
      canViewSubjects: false, canViewRooms: false, canViewSchedule: false,
      canManageSubjects: false, canManageRooms: false, canManageDocuments: false,
      canViewReports: false, canViewLeads: false,
    };
  }

  return {
    role,
    isCEO:     role === 'CEO' || role === 'DEV',
    isAdmin:   role === 'ADMIN',
    isTeacher: role === 'TEACHER',

    // Page/feature access
    canViewFinancialStats:  role !== 'ADMIN' && role !== 'TEACHER',   // CEO only
    canViewFinanceDebt:     role !== 'TEACHER',                        // CEO + ADMIN
    canChargeStudents:      role !== 'TEACHER',
    canEditStudents:        role !== 'TEACHER',
    canEditLeads:           role !== 'TEACHER',
    canEditClasses:         role !== 'TEACHER',
    canManageStaff:         role !== 'TEACHER',
    canChangeStaffStatus:   role === 'CEO' || role === 'DEV',          // CEO only
    canViewSubjects:        true,   // everyone
    canViewRooms:           true,   // everyone
    canViewSchedule:        true,   // everyone
    canManageSubjects:      role !== 'TEACHER',
    canManageRooms:         role !== 'TEACHER',
    canManageDocuments:     role !== 'TEACHER',
    canViewReports:         role !== 'TEACHER',
    canViewLeads:           role !== 'TEACHER',
  };
}
