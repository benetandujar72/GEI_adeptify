import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  role: string;
  instituteId?: string;
  isActive: boolean;
  lastLogin?: string;
  preferences?: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      const response = await api.get('/api/auth/me');
      console.log('Auth check successful:', response.data);
      setUser(response.data.user);
    } catch (error: any) {
      console.log('Auth check failed:', error.response?.status, error.message);
      setUser(null);
      // Clear any invalid tokens
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting login...');
      const response = await api.post('/api/auth/login', { email, password });
      console.log('Login successful:', response.data);
      setUser(response.data.user);
      
      // Store auth token if provided
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
    } catch (error: any) {
      console.error('Login failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error d\'inici de sessió');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('Redirecting to Google OAuth...');
      // Redirect to Google OAuth
      window.location.href = '/api/auth/google';
    } catch (error: any) {
      console.error('Google login failed:', error);
      throw new Error('Error iniciant sessió amb Google');
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
      console.log('Logout completed');
    }
  };

  const refreshUser = async () => {
    console.log('Refreshing user data...');
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 