import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../../server/index';
import { db } from '../../../../server/db';
import { activities } from '@shared/schema';

// Mock de la base de datos
vi.mock('../../../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock de autenticación
vi.mock('../../../../server/middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { id: 1, instituteId: 1, role: 'admin' };
    next();
  }),
  requireRole: vi.fn((role) => (req, res, next) => next())
}));

// Mock de auditoría
vi.mock('../../../../server/middleware/audit', () => ({
  auditLog: vi.fn((req, res, next) => next())
}));

describe('Calendar Routes', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = db as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/calendar/events', () => {
    it('should create a new calendar event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z',
        location: 'Test Location',
        type: 'activity',
        isAllDay: false
      };

      // Mock database insert
      const mockInsertResult = [{ id: 1, ...eventData }];
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockInsertResult)
        })
      });

      const response = await request(app)
        .post('/api/calendar/events')
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(eventData.title);
    });

    it('should validate required fields', async () => {
      const invalidEventData = {
        description: 'Test Description',
        startDate: '2024-01-01T10:00:00Z',
        endDate: '2024-01-01T11:00:00Z'
        // Missing title
      };

      const response = await request(app)
        .post('/api/calendar/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parámetros inválidos');
    });

    it('should validate date order', async () => {
      const invalidEventData = {
        title: 'Test Event',
        startDate: '2024-01-01T11:00:00Z',
        endDate: '2024-01-01T10:00:00Z' // End before start
      };

      const response = await request(app)
        .post('/api/calendar/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/calendar/events', () => {
    it('should retrieve calendar events', async () => {
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

      const response = await request(app)
        .get('/api/calendar/events')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBe(1);
    });

    it('should apply filters correctly', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .get('/api/calendar/events')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          types: 'activity,meeting',
          sources: 'internal'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate required query parameters', async () => {
      const response = await request(app)
        .get('/api/calendar/events')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Parámetros de consulta inválidos');
    });
  });

  describe('GET /api/calendar/events/:id', () => {
    it('should retrieve a specific event', async () => {
      const mockEvent = {
        id: 1,
        title: 'Test Event',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        type: 'activity',
        source: 'internal',
        isAllDay: false
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockEvent])
          })
        })
      });

      const response = await request(app)
        .get('/api/calendar/events/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Event');
    });

    it('should return 404 for non-existent event', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const response = await request(app)
        .get('/api/calendar/events/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Evento no encontrado');
    });
  });

  describe('PUT /api/calendar/events/:id', () => {
    it('should update an event', async () => {
      const updateData = {
        title: 'Updated Event',
        description: 'Updated Description'
      };

      const mockUpdateResult = [{
        id: 1,
        title: 'Updated Event',
        description: 'Updated Description',
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

      const response = await request(app)
        .put('/api/calendar/events/1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Event');
    });
  });

  describe('DELETE /api/calendar/events/:id', () => {
    it('should delete an event', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1 }])
        })
      });

      const response = await request(app)
        .delete('/api/calendar/events/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Evento eliminado correctamente');
    });
  });

  describe('GET /api/calendar/stats', () => {
    it('should return calendar statistics', async () => {
      const mockStats = {
        totalEvents: 10,
        byType: { activity: 5, meeting: 3, exam: 2 },
        bySource: { internal: 8, google: 2 },
        byMonth: { '2024-01': 10 },
        upcomingEvents: 3,
        pastEvents: 7,
        allDayEvents: 2,
        eventsWithLocation: 8
      };

      // Mock the calendar service
      vi.mock('../../../../server/services/calendar-service', () => ({
        calendarService: {
          getCalendarStats: vi.fn().mockResolvedValue(mockStats)
        }
      }));

      const response = await request(app)
        .get('/api/calendar/stats')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEvents).toBe(10);
    });
  });

  describe('POST /api/calendar/sync', () => {
    it('should sync with Google Calendar', async () => {
      const mockSyncResult = {
        synced: 5,
        errors: 0,
        details: ['✅ Sincronizado: Event 1', '✅ Sincronizado: Event 2']
      };

      // Mock the calendar service
      vi.mock('../../../../server/services/calendar-service', () => ({
        calendarService: {
          syncWithGoogleCalendar: vi.fn().mockResolvedValue(mockSyncResult)
        }
      }));

      const response = await request(app)
        .post('/api/calendar/sync')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.synced).toBe(5);
    });
  });

  describe('GET /api/calendar/conflicts', () => {
    it('should detect schedule conflicts', async () => {
      const mockConflicts = [
        {
          id: '1',
          title: 'Conflicting Event',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      // Mock the calendar service
      vi.mock('../../../../server/services/calendar-service', () => ({
        calendarService: {
          getScheduleConflicts: vi.fn().mockResolvedValue(mockConflicts)
        }
      }));

      const response = await request(app)
        .get('/api/calendar/conflicts')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/calendar/report', () => {
    it('should generate calendar report', async () => {
      const mockReport = {
        data: {
          period: { start: '2024-01-01T00:00:00Z', end: '2024-01-31T23:59:59Z' },
          statistics: { totalEvents: 10 },
          events: []
        },
        filename: 'calendario_1_2024-01-01_2024-01-31.pdf'
      };

      // Mock the calendar service
      vi.mock('../../../../server/services/calendar-service', () => ({
        calendarService: {
          generateCalendarReport: vi.fn().mockResolvedValue(mockReport)
        }
      }));

      const response = await request(app)
        .post('/api/calendar/report')
        .send({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          format: 'pdf'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filename).toContain('.pdf');
    });
  });

  describe('GET /api/calendar/health', () => {
    it('should return calendar service health status', async () => {
      const response = await request(app)
        .get('/api/calendar/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
    });
  });
}); 