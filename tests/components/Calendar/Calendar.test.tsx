import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Calendar } from '../../../client/src/components/Calendar/Calendar';
import { useApi } from '../../../client/src/hooks/useApi';
import { useToast } from '../../../client/src/hooks/use-toast';

// Mock de los hooks
vi.mock('../../../client/src/hooks/useApi');
vi.mock('../../../client/src/hooks/use-toast');

// Mock de FullCalendar
vi.mock('@fullcalendar/react', () => ({
  Calendar: ({ events, eventClick, dateSelect, eventDrop, eventResize }: any) => (
    <div data-testid="fullcalendar">
      {events?.map((event: any) => (
        <div key={event.id} data-testid={`event-${event.id}`} onClick={() => eventClick?.({ event })}>
          {event.title}
        </div>
      ))}
      <button data-testid="date-select" onClick={() => dateSelect?.({ start: new Date(), end: new Date() })}>
        Select Date
      </button>
      <button data-testid="event-drop" onClick={() => eventDrop?.({ event: { id: '1' }, delta: { hours: 1 } })}>
        Drop Event
      </button>
      <button data-testid="event-resize" onClick={() => eventResize?.({ event: { id: '1' }, endDelta: { hours: 1 } })}>
        Resize Event
      </button>
    </div>
  )
}));

vi.mock('@fullcalendar/daygrid', () => ({
  default: 'dayGridPlugin'
}));

vi.mock('@fullcalendar/timegrid', () => ({
  default: 'timeGridPlugin'
}));

vi.mock('@fullcalendar/interaction', () => ({
  default: 'interactionPlugin'
}));

vi.mock('@fullcalendar/core/locales/es', () => ({
  default: 'esLocale'
}));

// Mock de los componentes hijos
vi.mock('../../../client/src/components/Calendar/EventForm', () => ({
  EventForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="event-form">
      <button data-testid="submit-event" onClick={() => onSubmit({
        title: 'Test Event',
        description: 'Test Description',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        location: 'Test Location',
        type: 'activity',
        isAllDay: false
      })}>
        Submit Event
      </button>
      <button data-testid="cancel-event" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}));

vi.mock('../../../client/src/components/Calendar/EventDetails', () => ({
  EventDetails: ({ event, onClose, onEdit, onDelete }: any) => (
    <div data-testid="event-details">
      <h3>{event?.title}</h3>
      <button data-testid="edit-event" onClick={() => onEdit(event)}>
        Edit
      </button>
      <button data-testid="delete-event" onClick={() => onDelete(event?.id)}>
        Delete
      </button>
      <button data-testid="close-details" onClick={onClose}>
        Close
      </button>
    </div>
  )
}));

vi.mock('../../../client/src/components/Calendar/CalendarStats', () => ({
  CalendarStats: ({ stats, onClose }: any) => (
    <div data-testid="calendar-stats">
      <h3>Calendar Statistics</h3>
      <p>Total Events: {stats?.totalEvents || 0}</p>
      <button data-testid="close-stats" onClick={onClose}>
        Close
      </button>
    </div>
  )
}));

vi.mock('../../../client/src/components/Calendar/CalendarFilters', () => ({
  CalendarFilters: ({ filters, onApply, onClose }: any) => (
    <div data-testid="calendar-filters">
      <h3>Calendar Filters</h3>
      <button data-testid="apply-filters" onClick={() => onApply({
        types: ['activity'],
        sources: ['internal']
      })}>
        Apply Filters
      </button>
      <button data-testid="close-filters" onClick={onClose}>
        Close
      </button>
    </div>
  )
}));

describe('Calendar Component', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  };

  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useApi as any).mockReturnValue(mockApi);
    (useToast as any).mockReturnValue({ toast: mockToast });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render calendar component', () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });

      render(<Calendar />);

      expect(screen.getByTestId('fullcalendar')).toBeInTheDocument();
      expect(screen.getByText('Calendario')).toBeInTheDocument();
    });

    it('should render calendar with events', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Calendar />);

      expect(screen.getByText('Cargando eventos...')).toBeInTheDocument();
    });
  });

  describe('Event Creation', () => {
    it('should open event form on date select', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });

      render(<Calendar />);

      const dateSelectButton = screen.getByTestId('date-select');
      fireEvent.click(dateSelectButton);

      await waitFor(() => {
        expect(screen.getByTestId('event-form')).toBeInTheDocument();
      });
    });

    it('should create event successfully', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });
      mockApi.post.mockResolvedValue({ success: true, data: { id: '1', title: 'Test Event' } });

      render(<Calendar />);

      // Open event form
      const dateSelectButton = screen.getByTestId('date-select');
      fireEvent.click(dateSelectButton);

      await waitFor(() => {
        expect(screen.getByTestId('event-form')).toBeInTheDocument();
      });

      // Submit event
      const submitButton = screen.getByTestId('submit-event');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/calendar/events', expect.any(Object));
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Evento creado correctamente',
          variant: 'default'
        });
      });
    });

    it('should handle event creation error', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });
      mockApi.post.mockRejectedValue(new Error('Network error'));

      render(<Calendar />);

      // Open event form
      const dateSelectButton = screen.getByTestId('date-select');
      fireEvent.click(dateSelectButton);

      await waitFor(() => {
        expect(screen.getByTestId('event-form')).toBeInTheDocument();
      });

      // Submit event
      const submitButton = screen.getByTestId('submit-event');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al crear el evento',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Event Interaction', () => {
    it('should open event details on event click', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
      });

      // Click on event
      const eventElement = screen.getByTestId('event-1');
      fireEvent.click(eventElement);

      await waitFor(() => {
        expect(screen.getByTestId('event-details')).toBeInTheDocument();
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });
    });

    it('should update event on drag and drop', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });
      mockApi.put.mockResolvedValue({ success: true, data: mockEvents[0] });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
      });

      // Simulate event drop
      const dropButton = screen.getByTestId('event-drop');
      fireEvent.click(dropButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/calendar/events/1', expect.any(Object));
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Evento actualizado correctamente',
          variant: 'default'
        });
      });
    });

    it('should update event on resize', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });
      mockApi.put.mockResolvedValue({ success: true, data: mockEvents[0] });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
      });

      // Simulate event resize
      const resizeButton = screen.getByTestId('event-resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/calendar/events/1', expect.any(Object));
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Evento actualizado correctamente',
          variant: 'default'
        });
      });
    });
  });

  describe('Event Management', () => {
    it('should delete event successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });
      mockApi.delete.mockResolvedValue({ success: true });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
      });

      // Open event details
      const eventElement = screen.getByTestId('event-1');
      fireEvent.click(eventElement);

      await waitFor(() => {
        expect(screen.getByTestId('event-details')).toBeInTheDocument();
      });

      // Delete event
      const deleteButton = screen.getByTestId('delete-event');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith('/calendar/events/1');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Evento eliminado correctamente',
          variant: 'default'
        });
      });
    });

    it('should edit event successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          startDate: new Date('2024-01-01T10:00:00Z'),
          endDate: new Date('2024-01-01T11:00:00Z'),
          type: 'activity',
          source: 'internal',
          isAllDay: false
        }
      ];

      mockApi.get.mockResolvedValue({ success: true, data: mockEvents });
      mockApi.put.mockResolvedValue({ success: true, data: { ...mockEvents[0], title: 'Updated Event' } });

      render(<Calendar />);

      await waitFor(() => {
        expect(screen.getByTestId('event-1')).toBeInTheDocument();
      });

      // Open event details
      const eventElement = screen.getByTestId('event-1');
      fireEvent.click(eventElement);

      await waitFor(() => {
        expect(screen.getByTestId('event-details')).toBeInTheDocument();
      });

      // Edit event
      const editButton = screen.getByTestId('edit-event');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByTestId('event-form')).toBeInTheDocument();
      });
    });
  });

  describe('Calendar Features', () => {
    it('should show calendar statistics', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });

      render(<Calendar />);

      const statsButton = screen.getByTestId('calendar-stats-button');
      fireEvent.click(statsButton);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-stats')).toBeInTheDocument();
      });
    });

    it('should show calendar filters', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });

      render(<Calendar />);

      const filtersButton = screen.getByTestId('calendar-filters-button');
      fireEvent.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-filters')).toBeInTheDocument();
      });
    });

    it('should sync with Google Calendar', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });
      mockApi.post.mockResolvedValue({ success: true, data: { synced: 5, errors: 0 } });

      render(<Calendar />);

      const syncButton = screen.getByTestId('calendar-sync-button');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/calendar/sync');
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Sincronización completada: 5 eventos sincronizados',
          variant: 'default'
        });
      });
    });

    it('should generate calendar report', async () => {
      mockApi.get.mockResolvedValue({ success: true, data: [] });
      mockApi.post.mockResolvedValue({ 
        success: true, 
        data: { filename: 'calendario_1_2024-01-01_2024-01-31.pdf' } 
      });

      render(<Calendar />);

      const reportButton = screen.getByTestId('calendar-report-button');
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/calendar/report', expect.any(Object));
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Éxito',
          description: 'Reporte generado correctamente',
          variant: 'default'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('Network error'));

      render(<Calendar />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Error al cargar los eventos del calendario',
          variant: 'destructive'
        });
      });
    });

    it('should handle failed API responses', async () => {
      mockApi.get.mockResolvedValue({ success: false, error: 'Database error' });

      render(<Calendar />);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'No se pudieron cargar los eventos',
          variant: 'destructive'
        });
      });
    });
  });
}); 