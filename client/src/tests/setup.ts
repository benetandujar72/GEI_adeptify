import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock de React Router
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  Routes: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  Route: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  Navigate: () => React.createElement('div', {}, 'Navigate'),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => 
    React.createElement('a', { href: to }, children),
}));

// Mock de React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock de i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn(),
      language: 'es',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Configuración global de tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  localStorageMock.setItem.mockReturnValue(undefined);
  localStorageMock.removeItem.mockReturnValue(undefined);
  localStorageMock.clear.mockReturnValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
}); 