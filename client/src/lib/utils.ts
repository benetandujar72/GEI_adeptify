import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear fechas
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  
  return new Intl.DateTimeFormat('ca-ES', defaultOptions).format(dateObj);
}

// Función para formatear fechas cortas
export function formatShortDate(date: Date | string): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Función para formatear horas
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ca-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

// Función para obtener el color del módulo
export function getModuleColor(module: string): string {
  const colors = {
    evaluation: 'border-evaluation-primary bg-evaluation-primary/10',
    attendance: 'border-attendance-primary bg-attendance-primary/10',
    guard: 'border-guard-primary bg-guard-primary/10',
    survey: 'border-survey-primary bg-survey-primary/10',
    resource: 'border-resource-primary bg-resource-primary/10',
    analytics: 'border-analytics-primary bg-analytics-primary/10',
  };
  
  return colors[module as keyof typeof colors] || 'border-primary bg-primary/10';
}

// Función para obtener el icono del módulo
export function getModuleIcon(module: string): string {
  const icons = {
    evaluation: '📊',
    attendance: '📈',
    guard: '🛡️',
    survey: '📝',
    resource: '🏢',
    analytics: '📊',
  };
  
  return icons[module as keyof typeof icons] || '📋';
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Función para generar ID único
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Función para debounce
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Función para throttle
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Función para capitalizar primera letra
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Función para formatear números
export function formatNumber(num: number, locale = 'ca-ES'): string {
  return new Intl.NumberFormat(locale).format(num);
}

// Función para formatear porcentajes
export function formatPercentage(value: number, total: number): string {
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

// Función para obtener el estado del módulo
export function getModuleStatus(isActive: boolean): {
  label: string;
  color: string;
  icon: string;
} {
  if (isActive) {
    return {
      label: 'Actiu',
      color: 'text-green-600 bg-green-100',
      icon: '✅',
    };
  }
  
  return {
    label: 'Inactiu',
    color: 'text-red-600 bg-red-100',
    icon: '❌',
  };
}

// Función para obtener el rol del usuario
export function getUserRoleLabel(role: string): string {
  const roles = {
    super_admin: 'Super Administrador',
    institute_admin: 'Administrador d\'Institut',
    teacher: 'Professor',
    student: 'Estudiant',
    parent: 'Pare/Mare',
    staff: 'Personal',
  };
  
  return roles[role as keyof typeof roles] || role;
}

// Función para obtener el color del rol
export function getRoleColor(role: string): string {
  const colors = {
    super_admin: 'bg-purple-100 text-purple-800',
    institute_admin: 'bg-blue-100 text-blue-800',
    teacher: 'bg-green-100 text-green-800',
    student: 'bg-yellow-100 text-yellow-800',
    parent: 'bg-orange-100 text-orange-800',
    staff: 'bg-gray-100 text-gray-800',
  };
  
  return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
} 