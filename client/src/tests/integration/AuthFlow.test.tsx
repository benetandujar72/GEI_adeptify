import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { ToastProvider } from '../../components/ui/Toast';
import LoginPage from '../../pages/LoginPage';
import DashboardPage from '../../pages/DashboardPage';
import Layout from '../../components/Layout';

// Mock de la API
vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(await import('../../lib/apiClient')).apiClient;

// Wrapper para tests de integración
const IntegrationWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Login Process', () => {
    it('successfully logs in and redirects to dashboard', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher',
        institute: 'Test Institute'
      };

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-jwt-token'
        }
      });

      render(
        <IntegrationWrapper>
          <LoginPage />
        </IntegrationWrapper>
      );

      // Llenar formulario de login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      // Verificar que se llamó a la API
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Verificar que se guardó el token
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
    });

    it('shows error message on login failure', async () => {
      mockApiClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      });

      render(
        <IntegrationWrapper>
          <LoginPage />
        </IntegrationWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
      });
    });

    it('validates required fields before submission', async () => {
      render(
        <IntegrationWrapper>
          <LoginPage />
        </IntegrationWrapper>
      );

      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });
      fireEvent.click(loginButton);

      // Verificar que se muestren mensajes de validación
      await waitFor(() => {
        expect(screen.getByText(/el email es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument();
      });

      // Verificar que no se llamó a la API
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Protected Routes', () => {
    it('redirects to login when accessing protected route without authentication', () => {
      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      // Verificar que se redirija al login
      expect(window.location.pathname).toBe('/login');
    });

    it('allows access to protected routes when authenticated', async () => {
      // Simular usuario autenticado
      localStorage.setItem('token', 'mock-token');
      
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher'
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser }
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      // Verificar que se cargue el dashboard
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Process', () => {
    it('successfully logs out and clears session', async () => {
      // Simular usuario autenticado
      localStorage.setItem('token', 'mock-token');
      
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher'
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser }
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Hacer logout
      const userMenu = screen.getByRole('button', { name: /test user/i });
      fireEvent.click(userMenu);

      const logoutButton = screen.getByText(/cerrar sesión/i);
      fireEvent.click(logoutButton);

      // Verificar que se limpió el localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Role-based Access', () => {
    it('shows admin panel for superadmin users', async () => {
      localStorage.setItem('token', 'mock-token');
      
      const adminUser = {
        id: '1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'superadmin'
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { user: adminUser }
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/administración/i)).toBeInTheDocument();
      });
    });

    it('hides admin panel for non-admin users', async () => {
      localStorage.setItem('token', 'mock-token');
      
      const teacherUser = {
        id: '1',
        name: 'Teacher User',
        email: 'teacher@example.com',
        role: 'teacher'
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { user: teacherUser }
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/administración/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Session Persistence', () => {
    it('maintains session across page reloads', async () => {
      // Simular token existente
      localStorage.setItem('token', 'mock-token');
      
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'teacher'
      };

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { user: mockUser }
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      // Verificar que se mantenga la sesión
      await waitFor(() => {
        expect(screen.getByText(/test user/i)).toBeInTheDocument();
      });

      // Simular recarga de página
      window.location.reload();

      // Verificar que se vuelva a cargar el usuario
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    });

    it('handles expired tokens gracefully', async () => {
      localStorage.setItem('token', 'expired-token');
      
      mockApiClient.get.mockResolvedValueOnce({
        success: false,
        error: 'Token expired'
      });

      render(
        <IntegrationWrapper>
          <Layout>
            <DashboardPage />
          </Layout>
        </IntegrationWrapper>
      );

      // Verificar que se redirija al login
      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      });
    });
  });

  describe('Form Validation', () => {
    it('validates email format', async () => {
      render(
        <IntegrationWrapper>
          <LoginPage />
        </IntegrationWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
      });

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('validates password minimum length', async () => {
      render(
        <IntegrationWrapper>
          <LoginPage />
        </IntegrationWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/contraseña/i);
      const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText(/la contraseña debe tener al menos 6 caracteres/i)).toBeInTheDocument();
      });
    });
  });
}); 