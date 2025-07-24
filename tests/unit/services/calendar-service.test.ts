import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CalendarService, type CalendarEvent } from '../../../server/services/calendar-service';
import { db } from '../../../server/db';
import { activities } from '@shared/schema';

// Mock de las dependencias
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../server/websocket/notification-service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendToInstitute: vi.fn()
  }))
}));

vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        list: vi.fn()
      }
    })
  }
}));

describe('CalendarService', () => {
  let calendarService: CalendarService;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    calendarService = new CalendarService();
    mockDb = db as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize calendar service successfully', async () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/callback';

      await expect(calendarService.initialize()).resolves.not.toThrow();

      // Restore environment
      process.env = originalEnv;
    });

    it('should initialize without Google Calendar if credentials are missing', async () => {
      const originalEnv = process.env;
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      await expect(calendarService.initialize()).resolves.not.toThrow();

      process.env = originalEnv;
    });
  });

  describe('createEvent', () => {
    const mockEvent: Omit<CalendarEvent, 'id'> = {
      title: 'Test Event',
      description: 'Test Description',
      startDate: new Date('2024-01-01T10:00:00Z'),
      endDate: new Date('2024-01-01T11:00:00Z'),
      location: 'Test Location',
      type: 'activity',
      source: 'internal',
      isAllDay: false
    };

    it('should create an event successfully', async () => {
      // Mock database insert
      const mockInsertResult = [{ id: 1, ...mockEvent }];
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockInsertResult)
        })
      });

      const result = await calendarService.createEvent(mockEvent, 1, 1);

      expect(result).toBeDefined();
      expect(result.title).toBe(mockEvent.title);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error for invalid event data', async () => {
      const invalidEvent = {
        ...mockEvent,
        startDate: new Date('2024-01-01T11:00:00Z'),
        endDate: new Date('2024-01-01T10:00:00Z') // End before start
      };

      await expect(calendarService.createEvent(invalidEvent, 1, 1))
        .rejects.toThrow('La fecha de fin debe ser posterior a la fecha de inicio');
    });
  });

  describe('getEvents', () => {
    it('should retrieve events for a date range', async () => {
      const mockEvents = [
        {
          id: 1,
          title: 'Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockEvents)
          })
        })
      });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const result = await calendarService.getEvents(1, startDate, endDate);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');
      const filters = {
        types: ['activity'],
        sources: ['internal'],
        userId: 1
      };

      await calendarService.getEvents(1, startDate, endDate, filters);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const mockUpdateResult = [{
        id: 1,
        title: 'Updated Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        type: 'activity',
        source: 'internal',
        isAllDay: false
      }];

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(mockUpdateResult)
          })
        })
      });

      const updates = { title: 'Updated Event' };
      const result = await calendarService.updateEvent('1', updates, 1, 1);

      expect(result).toBeDefined();
      expect(result.title).toBe('Updated Event');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }])
        })
      });

      await expect(calendarService.deleteEvent('1', 1, 1)).resolves.not.toThrow();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('getCalendarStats', () => {
    it('should return calendar statistics', async () => {
      const mockEvents = [
        {
          id: 1,
          title: 'Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      // Mock getEvents method
      vi.spyOn(calendarService, 'getEvents').mockResolvedValue(mockEvents);

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const stats = await calendarService.getCalendarStats(1, startDate, endDate);

      expect(stats).toBeDefined();
      expect(stats.totalEvents).toBe(1);
      expect(stats.byType).toHaveProperty('activity');
      expect(stats.bySource).toHaveProperty('internal');
    });
  });

  describe('getScheduleConflicts', () => {
    it('should detect schedule conflicts', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        },
        {
          id: '2',
          title: 'Event 2',
          startDate: new Date('2024-01-01T10:30:00Z'),
          endDate: new Date('2024-01-01T11:30:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      // Mock getEvents method
      vi.spyOn(calendarService, 'getEvents').mockResolvedValue(mockEvents);

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const conflicts = await calendarService.getScheduleConflicts(1, startDate, endDate);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('generateCalendarReport', () => {
    it('should generate calendar report', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      // Mock getEvents and getCalendarStats methods
      vi.spyOn(calendarService, 'getEvents').mockResolvedValue(mockEvents);
      vi.spyOn(calendarService, 'getCalendarStats').mockResolvedValue({
        totalEvents: 1,
        byType: { activity: 1 },
        bySource: { internal: 1 },
        byMonth: { '2024-01': 1 },
        upcomingEvents: 1,
        pastEvents: 0,
        allDayEvents: 0,
        eventsWithLocation: 0
      });

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-31T23:59:59Z');

      const report = await calendarService.generateCalendarReport(1, startDate, endDate, 'pdf');

      expect(report).toBeDefined();
      expect(report.data).toBeDefined();
      expect(report.filename).toBeDefined();
      expect(report.filename).toContain('.pdf');
    });
  });
}); 