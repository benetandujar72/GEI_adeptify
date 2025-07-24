import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIChatbot from '../../../client/src/components/ai/AIChatbot';

// Mock useApi hook
vi.mock('../../../client/src/hooks/useApi', () => ({
  useApi: () => ({
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  })
}));

// Mock useToast hook
vi.mock('../../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/ai-chatbot' })
  };
});

describe('AIChatbot Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  describe('Initial Render', () => {
    it('should render the chatbot interface', () => {
      renderWithProviders(<AIChatbot />);

      expect(screen.getByText(/AI Educational Assistant/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Type your message.../i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('should show new session button when no sessions exist', () => {
      renderWithProviders(<AIChatbot />);

      expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument();
    });

    it('should display welcome message', () => {
      renderWithProviders(<AIChatbot />);

      expect(screen.getByText(/Welcome to the AI Educational Assistant/i)).toBeInTheDocument();
      expect(screen.getByText(/I'm here to help you with your studies/i)).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should create a new session when new session button is clicked', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            sessionId: 'session123',
            userId: 'user123',
            context: 'educational',
            messages: []
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const newSessionButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(newSessionButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/ai/chat/sessions', {
          userId: expect.any(String),
          context: 'educational'
        });
      });
    });

    it('should load existing sessions on component mount', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              sessionId: 'session1',
              userId: 'user123',
              context: 'educational',
              messages: [],
              createdAt: new Date().toISOString()
            }
          ]
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: vi.fn(),
        get: mockGet,
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/ai/chat/sessions/user123');
      });
    });

    it('should delete a session when delete button is clicked', async () => {
      const mockDelete = vi.fn().mockResolvedValue({
        data: { success: true }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: vi.fn(),
        get: vi.fn().mockResolvedValue({
          data: {
            success: true,
            data: [
              {
                sessionId: 'session1',
                userId: 'user123',
                context: 'educational',
                messages: [],
                createdAt: new Date().toISOString()
              }
            ]
          }
        }),
        delete: mockDelete
      });

      renderWithProviders(<AIChatbot />);

      await waitFor(() => {
        const deleteButton = screen.getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('/ai/chat/sessions/session1');
      });
    });
  });

  describe('Message Sending', () => {
    it('should send a message when send button is clicked', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'Hello! How can I help you with your studies?',
            role: 'assistant',
            sentiment: { label: 'positive', score: 0.8 },
            topics: ['education', 'help'],
            suggestions: ['Ask about math', 'Ask about science']
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Hello, I need help with math' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/ai/chat/messages', {
          sessionId: expect.any(String),
          content: 'Hello, I need help with math',
          role: 'user'
        });
      });
    });

    it('should send a message when Enter key is pressed', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'I can help you with math!',
            role: 'assistant',
            sentiment: { label: 'positive', score: 0.9 },
            topics: ['math', 'help'],
            suggestions: ['Algebra', 'Geometry', 'Calculus']
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      fireEvent.change(input, { target: { value: 'Can you help me with algebra?' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/ai/chat/messages', {
          sessionId: expect.any(String),
          content: 'Can you help me with algebra?',
          role: 'user'
        });
      });
    });

    it('should not send empty messages', () => {
      const mockPost = vi.fn();

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: '' } });
      fireEvent.click(sendButton);

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('should show loading state while sending message', async () => {
      const mockPost = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            success: true,
            data: {
              content: 'Response',
              role: 'assistant'
            }
          }
        }), 1000))
      );

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should display user and AI messages correctly', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'I can help you with that!',
            role: 'assistant',
            sentiment: { label: 'positive', score: 0.8 },
            topics: ['help'],
            suggestions: ['More help']
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('I can help you with that!')).toBeInTheDocument();
      });
    });

    it('should display sentiment indicators', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'Great job!',
            role: 'assistant',
            sentiment: { label: 'positive', score: 0.9 },
            topics: ['encouragement'],
            suggestions: []
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'I did well on my test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/positive/i)).toBeInTheDocument();
      });
    });

    it('should display suggestions as clickable buttons', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'Here are some topics you might be interested in:',
            role: 'assistant',
            sentiment: { label: 'neutral', score: 0.5 },
            topics: ['topics'],
            suggestions: ['Math Help', 'Science Help', 'English Help']
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'What can you help me with?' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Math Help/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Science Help/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /English Help/i })).toBeInTheDocument();
      });
    });
  });

  describe('Suggestion Handling', () => {
    it('should send suggestion as message when clicked', async () => {
      const mockPost = vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            content: 'Response',
            role: 'assistant',
            sentiment: { label: 'neutral', score: 0.5 },
            topics: [],
            suggestions: []
          }
        }
      });

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      renderWithProviders(<AIChatbot />);

      // First, send a message to get suggestions
      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'What can you help me with?' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const suggestionButton = screen.getByRole('button', { name: /Math Help/i });
        fireEvent.click(suggestionButton);
      });

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/ai/chat/messages', {
          sessionId: expect.any(String),
          content: 'Math Help',
          role: 'user'
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API call fails', async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockToast = vi.fn();

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      vi.mocked(require('../../../client/src/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to send message. Please try again.',
          variant: 'destructive'
        });
      });
    });

    it('should handle session creation failure', async () => {
      const mockPost = vi.fn().mockRejectedValue(new Error('Session creation failed'));
      const mockToast = vi.fn();

      vi.mocked(require('../../../client/src/hooks/useApi').useApi).mockReturnValue({
        post: mockPost,
        get: vi.fn(),
        delete: vi.fn()
      });

      vi.mocked(require('../../../client/src/hooks/use-toast').useToast).mockReturnValue({
        toast: mockToast
      });

      renderWithProviders(<AIChatbot />);

      const newSessionButton = screen.getByRole('button', { name: /new session/i });
      fireEvent.click(newSessionButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to create new session. Please try again.',
          variant: 'destructive'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<AIChatbot />);

      expect(screen.getByLabelText(/message input/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithProviders(<AIChatbot />);

      const input = screen.getByPlaceholderText(/Type your message.../i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      input.focus();
      expect(input).toHaveFocus();

      fireEvent.keyDown(input, { key: 'Tab' });
      expect(sendButton).toHaveFocus();
    });
  });
}); 