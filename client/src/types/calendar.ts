/**
 * Tipos para el sistema de calendario
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  attendees?: string[];
  color?: string;
  type: 'activity' | 'guard' | 'meeting' | 'exam' | 'holiday' | 'custom';
  source: 'internal' | 'google' | 'outlook';
  isAllDay: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };
  reminders?: {
    type: 'email' | 'push' | 'sms';
    minutes: number;
  }[];
  metadata?: Record<string, any>;
}

export interface CalendarConfig {
  instituteId: number;
  googleCalendarId?: string;
  autoSync: boolean;
  syncFrequency: number; // en minutos
  defaultEventDuration: number; // en minutos
  workingHours: {
    start: string; // formato "HH:mm"
    end: string;
    days: number[]; // 0-6 (domingo-sábado)
  };
  notifications: {
    enabled: boolean;
    channels: ('email' | 'push' | 'sms')[];
    advanceTime: number; // en minutos
  };
}

export interface CalendarFilters {
  types: string[];
  sources: string[];
  userId?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CalendarStats {
  totalEvents: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  byMonth: Record<string, number>;
  upcomingEvents: number;
  pastEvents: number;
  allDayEvents: number;
  eventsWithLocation: number;
}

export interface CalendarSyncResult {
  synced: number;
  errors: number;
  details: string[];
}

export interface CalendarReport {
  period: {
    start: string;
    end: string;
  };
  statistics: CalendarStats;
  events: Array<{
    id: string;
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    location?: string;
    type: string;
    source: string;
    isAllDay: boolean;
  }>;
}

export interface CalendarHealth {
  status: 'healthy' | 'warning' | 'error';
  googleCalendar: 'configured' | 'not_configured' | 'error';
  autoSync: boolean;
  lastSync: string;
  stats: {
    totalEvents: number;
    upcomingEvents: number;
  };
}

export interface EventFormData {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  type: 'activity' | 'guard' | 'meeting' | 'exam' | 'holiday' | 'custom';
  isAllDay: boolean;
  reminders?: {
    type: 'email' | 'push' | 'sms';
    minutes: number;
  }[];
}

export interface CalendarView {
  id: string;
  name: string;
  type: 'month' | 'week' | 'day' | 'agenda';
  default: boolean;
}

export interface CalendarNotification {
  id: string;
  eventId: string;
  type: 'reminder' | 'update' | 'cancellation';
  title: string;
  message: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  channels: ('email' | 'push' | 'sms')[];
}

export interface CalendarConflict {
  event1: CalendarEvent;
  event2: CalendarEvent;
  overlapStart: Date;
  overlapEnd: Date;
  severity: 'low' | 'medium' | 'high';
}

export interface CalendarExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'ics';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeDetails: boolean;
  includeAttendees: boolean;
  includeLocation: boolean;
  filters?: CalendarFilters;
}

export interface CalendarImportOptions {
  source: 'google' | 'outlook' | 'ics' | 'csv';
  file?: File;
  url?: string;
  options: {
    overwriteExisting: boolean;
    createMissing: boolean;
    updateExisting: boolean;
    defaultType: string;
  };
}

export interface CalendarSharingOptions {
  public: boolean;
  allowEdit: boolean;
  allowView: boolean;
  password?: string;
  expiryDate?: Date;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
}

export interface CalendarWidget {
  id: string;
  name: string;
  type: 'upcoming' | 'today' | 'week' | 'stats';
  config: {
    maxEvents: number;
    showLocation: boolean;
    showTime: boolean;
    refreshInterval: number;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CalendarTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    eventColors: Record<string, string>;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

export interface CalendarPreferences {
  userId: number;
  defaultView: string;
  defaultEventDuration: number;
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  notifications: {
    enabled: boolean;
    channels: ('email' | 'push' | 'sms')[];
    advanceTime: number;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  display: {
    showWeekends: boolean;
    showBusinessHours: boolean;
    showEventLocation: boolean;
    showEventDescription: boolean;
    compactMode: boolean;
  };
  theme: string;
  language: string;
  timezone: string;
} 