import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import LanguageSelector from './LanguageSelector';
import AIChatbot from './ai/AIChatbot';
import { NotificationCenter } from './NotificationCenter';
import { cn, getUserRoleLabel, getRoleColor } from '../lib/utils';
import { 
  Menu, 
  X, 
  Home, 
  BookOpen, 
  Users, 
  Shield, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Settings,
  LogOut,
  User,
  Sun,
  Moon,
  Bell,
  Bot
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  const modules = [
    {
      id: 'evaluation',
      name: 'Evaluación',
      icon: '📊',
      color: 'evaluation',
      path: '/evaluation',
      description: 'Sistema de evaluación por competencias',
    },
    {
      id: 'attendance',
      name: 'Asistencia',
      icon: '📈',
      color: 'attendance',
      path: '/attendance',
      description: 'Control de asistencia estudiantil',
    },
    {
      id: 'guard',
      name: 'Guardias',
      icon: '🛡️',
      color: 'guard',
      path: '/guard',
      description: 'Gestión automática de guardias',
    },
    {
      id: 'surveys',
      name: 'Encuestas',
      icon: '📝',
      color: 'survey',
      path: '/surveys',
      description: 'Sistema de encuestas y valoraciones',
    },
    {
      id: 'resources',
      name: 'Recursos',
      icon: '🏢',
      color: 'resource',
      path: '/resources',
      description: 'Reservas inteligentes de espacios',
    },
    {
      id: 'analytics',
      name: 'Analíticas',
      icon: '📊',
      color: 'analytics',
      path: '/analytics',
      description: 'Dashboard de logros académicos',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">🎓</span>
            </div>
            <span className="font-bold text-lg">GEI Platform</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {/* AI Chatbot Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChatbotOpen(!chatbotOpen)}
              className="w-9 h-9 p-0 relative"
            >
              <Bot className="h-4 w-4" />
              {chatbotOpen && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
              )}
            </Button>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Notifications */}
            <NotificationCenter />

            {/* User dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {user?.name || 'Usuario'}
                </span>
              </Button>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-9 h-9 p-0"
            >
              {sidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Navegación</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {/* Dashboard */}
              <a
                href="/dashboard"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </a>

              {/* Modules */}
              {modules.map((module) => (
                <a
                  key={module.id}
                  href={module.path}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <span className="text-lg">{module.icon}</span>
                  <div className="flex-1">
                    <div>{module.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {module.description}
                    </div>
                  </div>
                </a>
              ))}

              {/* Admin section */}
              {user?.role === 'superadmin' && (
                <div className="pt-4 border-t">
                  <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administración
                  </h3>
                  <a
                    href="/admin"
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Panel de Admin</span>
                  </a>
                </div>
              )}
            </nav>

            {/* Sidebar footer */}
            <div className="p-4 border-t">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getUserRoleLabel(user?.role || '')}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* AI Chatbot */}
      <AIChatbot
        isOpen={chatbotOpen}
        onClose={() => setChatbotOpen(false)}
        context="general"
        module="general"
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
} 