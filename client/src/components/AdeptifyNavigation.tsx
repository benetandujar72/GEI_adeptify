import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  BookOpen, 
  Target, 
  FileText, 
  BarChart3, 
  Settings,
  ChevronRight,
  Home
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Competències',
    href: '/adeptify/competencies',
    icon: BookOpen,
    description: 'Gestiona les competències i els seus criteris'
  },
  {
    label: 'Criteris',
    href: '/adeptify/criteria',
    icon: Target,
    description: 'Configura els criteris d\'avaluació'
  },
  {
    label: 'Avaluacions',
    href: '/adeptify/evaluations',
    icon: FileText,
    description: 'Realitza i gestiona avaluacions'
  },
  {
    label: 'Estadístiques',
    href: '/adeptify/statistics',
    icon: BarChart3,
    description: 'Visualitza estadístiques i reportes'
  },
  {
    label: 'Configuració',
    href: '/adeptify/settings',
    icon: Settings,
    description: 'Configura el mòdul Adeptify'
  }
];

export default function AdeptifyNavigation() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === '/adeptify/competencies') {
      return location === href || location.startsWith('/adeptify/competencies/');
    }
    return location === href;
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-500 hover:text-gray-700">
              <Home className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">Adeptify</span>
          </div>

          {/* Navigation Items */}
          <nav className="flex space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
} 