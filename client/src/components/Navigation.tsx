import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  Home,
  Shield,
  TrendingUp,
  FileText,
  MessageSquare,
  GraduationCap,
  Target,
  BarChart3,
  Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  children?: NavigationItem[];
}

export default function Navigation() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      'super_admin': 'Administrador General',
      'institute_admin': 'Administrador d\'Institut',
      'teacher': 'Professor',
      'student': 'Estudiant',
      'parent': 'Pare/Mare',
      'staff': 'Personal'
    };
    return roleNames[role] || role;
  };

  const getInitials = (firstName?: string, lastName?: string, displayName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  const navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard
    },
    {
      label: 'Sistema Educativo',
      href: '/educational-dashboard',
      icon: GraduationCap,
      children: [
        { label: 'Dashboard Educativo', href: '/educational-dashboard', icon: BarChart3 },
        { label: 'Cursos', href: '/courses', icon: BookOpen },
        { label: 'Evaluaciones', href: '/evaluations', icon: Award },
        { label: 'Calificaciones', href: '/grades', icon: Target },
        { label: 'Asistencia', href: '/attendance', icon: Users }
      ]
    },
    {
      label: 'Adeptify',
      href: '/adeptify',
      icon: BookOpen,
      children: [
        { label: 'Competències', href: '/adeptify/competencies', icon: FileText },
        { label: 'Evaluacions', href: '/adeptify/evaluations', icon: TrendingUp },
        { label: 'Criteris', href: '/adeptify/criteria', icon: FileText }
      ]
    },
    {
      label: 'Assistatut',
      href: '/assistatut',
      icon: Users,
      children: [
        { label: 'Guàrdies', href: '/assistatut/guards', icon: Shield },
        { label: 'Assistència', href: '/assistatut/attendance', icon: Users },
        { label: 'Horaris', href: '/assistatut/schedules', icon: Calendar }
      ]
    },
    {
      label: 'Calendari',
      href: '/calendar',
      icon: Calendar
    },
    {
      label: 'Comunicació',
      href: '/communication',
      icon: MessageSquare,
      badge: 3
    },
    {
      label: 'Notificacions',
      href: '/notifications',
      icon: Bell,
      badge: 5
    }
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location === '/';
    }
    return location.startsWith(href);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold text-gray-900">GEI Unified</span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="mt-8 flex-grow">
            <div className="px-2 space-y-1">
              {navigationItems.map((item) => (
                <div key={item.href}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-3 flex-shrink-0 h-5 w-5',
                          isActive(item.href)
                            ? 'text-blue-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </Link>
                  
                  {/* Submenu */}
                  {item.children && isActive(item.href) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          <div
                            className={cn(
                              'group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                              isActive(child.href)
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            )}
                          >
                            <child.icon
                              className={cn(
                                'mr-3 flex-shrink-0 h-4 w-4',
                                isActive(child.href)
                                  ? 'text-blue-400'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              )}
                            />
                            <span>{child.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2">
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                    <AvatarFallback>
                      {getInitials(user?.firstName, user?.lastName, user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.displayName || 'Usuari'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRoleDisplayName(user?.role || '')}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>El meu compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuració</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Tancar sessió</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="text-lg font-bold text-gray-900">GEI Unified</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                  3
                </Badge>
              </Button>
              
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <SheetHeader>
                    <SheetTitle>GEI Unified</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-2">
                    {navigationItems.map((item) => (
                      <div key={item.href}>
                        <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                          <div
                            className={cn(
                              'flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                              isActive(item.href)
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <item.icon
                              className={cn(
                                'mr-3 flex-shrink-0 h-5 w-5',
                                isActive(item.href)
                                  ? 'text-blue-500'
                                  : 'text-gray-400'
                              )}
                            />
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        </Link>
                        
                        {/* Mobile Submenu */}
                        {item.children && isActive(item.href) && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.children.map((child) => (
                              <Link key={child.href} href={child.href} onClick={() => setIsMobileMenuOpen(false)}>
                                <div
                                  className={cn(
                                    'flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors',
                                    isActive(child.href)
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                  )}
                                >
                                  <child.icon
                                    className={cn(
                                      'mr-3 flex-shrink-0 h-4 w-4',
                                      isActive(child.href)
                                        ? 'text-blue-400'
                                        : 'text-gray-400'
                                    )}
                                  />
                                  <span>{child.label}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Mobile User Menu */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center px-3 py-2">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                        <AvatarFallback>
                          {getInitials(user?.firstName, user?.lastName, user?.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.displayName || 'Usuari'
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {getRoleDisplayName(user?.role || '')}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        Configuració
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Tancar sessió
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
        
        {/* Mobile Spacer */}
        <div className="h-16"></div>
      </div>

      {/* Main Content Wrapper */}
      <div className="lg:pl-64">
        <main className="min-h-screen bg-gray-50">
          {/* Content will be rendered here */}
        </main>
      </div>
    </>
  );
} 