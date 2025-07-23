import React, { createContext, useContext, useEffect, useState } from 'react';

// Tipos
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  instituteId?: string;
  institute?: {
    id: string;
    name: string;
    code: string;
  };
  photoURL?: string;
  preferences?: Record<string, any>;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  isAdmin: boolean;
  instituteName: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  signIn: () => void;
  devLogin: () => void;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  instituteCode?: string;
}

// Contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook personalizado
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Verificar sesión al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Timeout de 5 segundos para la verificación de auth
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        console.log('Auth check failed, user not authenticated');
        setUser(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Auth check timeout, continuing without auth');
      } else {
        console.error('Error checking auth:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error d\'inici de sessió');
      }

      // Establecer el usuario en el contexto
      setUser(data.user);
      
      // Verificar que la sesión se estableció correctamente
      setTimeout(async () => {
        try {
          const meResponse = await fetch('/api/auth/me', {
            credentials: 'include',
          });
          
          if (meResponse.ok) {
            const meData = await meResponse.json();
            console.log('✅ Sesión verificada:', meData);
            // Redirigir solo si la sesión está confirmada
            window.location.href = '/dashboard';
          } else {
            console.error('❌ Error verificando sesión:', meResponse.status);
            setError('Error verificando la sesión');
          }
        } catch (error) {
          console.error('❌ Error verificando sesión:', error);
          setError('Error verificando la sesión');
        }
      }, 500); // Esperar 500ms para que la sesión se establezca
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error d\'inici de sessió');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const signIn = () => {
    setIsSigningIn(true);
    window.location.href = '/api/auth/google';
  };

  const devLogin = () => {
    setIsSigningIn(true);
    // Simular login de desarrollo
    setTimeout(() => {
      setUser({
        id: 'dev-user',
        email: 'dev@example.com',
        displayName: 'Developer User',
        role: 'admin',
        instituteId: 'dev-institute',
        institute: {
          id: 'dev-institute',
          name: 'Institut de Desenvolupament',
          code: 'DEV'
        }
      });
      setIsSigningIn(false);
    }, 1000);
  };

  const logout = async () => {
    try {
      setLoading(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error de registre');
      }

      // No establecer el usuario automáticamente, debe hacer login
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error de registre');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al canviar la contrasenya');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al canviar la contrasenya');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isSigningIn,
    isAdmin: user?.role === 'admin',
    instituteName: user?.institute?.name || null,
    login,
    loginWithGoogle,
    signIn,
    devLogin,
    logout,
    register,
    changePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 