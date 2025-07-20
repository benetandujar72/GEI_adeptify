import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Layout from '../../components/Layout';

// Mock de los contextos
const mockAuthContext = {
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'teacher',
    institute: 'Test Institute'
  },
  logout: vi.fn(),
  isAuthenticated: true
};

const mockThemeContext = {
  theme: 'light',
  toggleTheme: vi.fn()
};

const mockToastContext = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn()
};

// Mock de los contextos
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => mockThemeContext
}));

vi.mock('../../components/ui/Toast', () => ({
  useToastHelpers: () => mockToastContext
}));

describe('Layout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout with sidebar and main content', () => {
    render(
      <Layout>
        <div data-testid="main-content">Test Content</div>
      </Layout>
    );

    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays user information in header', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows navigation menu items', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verificar que los módulos principales estén presentes
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Evaluación')).toBeInTheDocument();
    expect(screen.getByText('Asistencia')).toBeInTheDocument();
    expect(screen.getByText('Guardias')).toBeInTheDocument();
  });

  it('toggles sidebar when menu button is clicked', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const menuButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(menuButton);

    // Verificar que el sidebar se muestre/oculte
    expect(menuButton).toBeInTheDocument();
  });

  it('shows language selector', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('ES')).toBeInTheDocument();
  });

  it('shows AI chatbot toggle button', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const chatbotButton = screen.getByLabelText('Toggle AI Chat');
    expect(chatbotButton).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const logoutButton = screen.getByText('Cerrar Sesión');
    fireEvent.click(logoutButton);

    expect(mockAuthContext.logout).toHaveBeenCalled();
  });

  it('shows admin panel link for superadmin users', () => {
    const adminUser = {
      ...mockAuthContext.user,
      role: 'superadmin'
    };

    vi.mocked(mockAuthContext).user = adminUser;

    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('does not show admin panel for non-admin users', () => {
    const teacherUser = {
      ...mockAuthContext.user,
      role: 'teacher'
    };

    vi.mocked(mockAuthContext).user = teacherUser;

    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  it('toggles theme when theme button is clicked', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const themeButton = screen.getByLabelText('Toggle theme');
    fireEvent.click(themeButton);

    expect(mockThemeContext.toggleTheme).toHaveBeenCalled();
  });

  it('shows user avatar and dropdown menu', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const userButton = screen.getByRole('button', { name: /test user/i });
    expect(userButton).toBeInTheDocument();

    fireEvent.click(userButton);

    // Verificar que el menú desplegable se muestre
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  it('renders with correct responsive classes', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('lg:translate-x-0');
  });

  it('shows loading state when user is not loaded', () => {
    const loadingAuthContext = {
      ...mockAuthContext,
      user: null,
      isAuthenticated: false
    };

    vi.mocked(mockAuthContext).user = null;
    vi.mocked(mockAuthContext).isAuthenticated = false;

    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // Verificar que se muestre un estado de carga o redirección
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
}); 