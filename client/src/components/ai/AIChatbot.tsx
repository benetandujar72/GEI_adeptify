import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Send, Bot, User, MessageSquare, X, Plus, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useApi } from '../../hooks/useApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    confidence?: number;
    topics?: string[];
  };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: string;
}

interface ChatResponse {
  message: ChatMessage;
  suggestions: string[];
  relatedTopics: string[];
  confidence: number;
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const api = useApi();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load chat sessions on mount
  useEffect(() => {
    if (isOpen) {
      loadChatSessions();
    }
  }, [isOpen]);

  const loadChatSessions = async () => {
    try {
      const response = await api.get('/ai/chat/sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await api.post('/ai/chat/sessions', {
        title: 'Nueva conversación'
      });
      
      const newSession = response.data;
      setCurrentSession(newSession);
      setMessages([]);
      setSuggestions([]);
      setRelatedTopics([]);
      setShowSessions(false);
      
      // Add to sessions list
      setSessions(prev => [newSession, ...prev]);
      
      toast({
        title: 'Nueva conversación creada',
        description: 'Puedes comenzar a chatear con el asistente IA',
      });
    } catch (error) {
      console.error('Error creating new session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la nueva conversación',
        variant: 'destructive',
      });
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      // In a real implementation, you would load the session messages here
      // For now, we'll just set the session as current
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
        setMessages([]); // In real implementation, load messages from API
        setShowSessions(false);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await api.delete(`/ai/chat/sessions/${sessionId}`);
      
      // Remove from sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // If this was the current session, create a new one
      if (currentSession?.id === sessionId) {
        await createNewSession();
      }
      
      toast({
        title: 'Conversación eliminada',
        description: 'La conversación ha sido eliminada correctamente',
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación',
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat/messages', {
        sessionId: currentSession?.id,
        content: userMessage.content
      });

      const chatResponse: ChatResponse = response.data;
      
      // Add assistant message
      setMessages(prev => [...prev, chatResponse.message]);
      
      // Update suggestions and related topics
      setSuggestions(chatResponse.suggestions);
      setRelatedTopics(chatResponse.relatedTopics);

      // Update current session if it was a new session
      if (!currentSession && response.data.sessionId) {
        const newSession: ChatSession = {
          id: response.data.sessionId,
          title: 'Nueva conversación',
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 2
        };
        setCurrentSession(newSession);
        setSessions(prev => [newSession, ...prev]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 z-50"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end p-4">
          <Card className="w-96 h-[600px] flex flex-col shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">Asistente IA</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSessions(!showSessions)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Sessions List */}
              {showSessions && (
                <div className="border-b p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Conversaciones</h3>
                    <Button size="sm" onClick={createNewSession}>
                      Nueva
                    </Button>
                  </div>
                  <ScrollArea className="h-32">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => loadSession(session.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.messageCount} mensajes
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Bot className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>¡Hola! Soy tu asistente educativo IA.</p>
                      <p className="text-sm">¿En qué puedo ayudarte hoy?</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {message.role === 'assistant' && (
                            <Bot className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{message.content}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs opacity-70">
                                {formatTime(message.timestamp)}
                              </span>
                              {message.metadata?.sentiment && (
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getSentimentColor(message.metadata.sentiment)}`}
                                >
                                  {message.metadata.sentiment}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <User className="w-4 h-4 mt-0.5 text-white flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-blue-600" />
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                          <span className="text-sm text-gray-600">Escribiendo...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="border-t p-3">
                  <p className="text-xs text-gray-500 mb-2">Sugerencias:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Topics */}
              {relatedTopics.length > 0 && (
                <div className="border-t p-3">
                  <p className="text-xs text-gray-500 mb-2">Temas relacionados:</p>
                  <div className="flex flex-wrap gap-1">
                    {relatedTopics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-3">
                <div className="flex space-x-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu mensaje..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}; 