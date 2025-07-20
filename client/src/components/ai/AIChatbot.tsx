import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useChatMessage, useGenerateContent } from '../../hooks/useApi';
import { useToastHelpers } from '../ui/Toast';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  MessageSquare, 
  X,
  Copy,
  Download,
  RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; url: string }>;
  metadata?: Record<string, any>;
}

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  module?: string;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ 
  isOpen, 
  onClose, 
  context = 'general',
  module = 'general'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { success, error } = useToastHelpers();
  const chatMessage = useChatMessage();
  const generateContent = useGenerateContent();

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: getWelcomeMessage(module),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, module]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const getWelcomeMessage = (module: string): string => {
    const welcomeMessages = {
      evaluation: "¡Hola! Soy tu asistente de evaluación. Puedo ayudarte a crear evaluaciones, analizar resultados, y generar reportes. ¿En qué puedo ayudarte?",
      attendance: "¡Hola! Soy tu asistente de asistencia. Puedo ayudarte con el control de asistencia, generar reportes y analizar tendencias. ¿Qué necesitas?",
      guard: "¡Hola! Soy tu asistente de guardias. Puedo ayudarte a asignar guardias, optimizar horarios y gestionar el personal. ¿Cómo puedo ayudarte?",
      surveys: "¡Hola! Soy tu asistente de encuestas. Puedo ayudarte a crear encuestas, analizar respuestas y generar insights. ¿Qué te gustaría hacer?",
      resources: "¡Hola! Soy tu asistente de recursos. Puedo ayudarte con reservas, gestión de espacios y optimización de recursos. ¿En qué puedo ayudarte?",
      analytics: "¡Hola! Soy tu asistente de analíticas. Puedo ayudarte a analizar datos, generar reportes y visualizar tendencias. ¿Qué datos te interesan?",
      general: "¡Hola! Soy tu asistente AI. Puedo ayudarte con cualquier tarea relacionada con la gestión académica. ¿En qué puedo ayudarte hoy?"
    };
    return welcomeMessages[module as keyof typeof welcomeMessages] || welcomeMessages.general;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Intentar primero con el chat general
      const response = await chatMessage.execute(inputValue.trim(), context);
      
      if (response?.success && response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
          sources: response.data.sources,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Si falla el chat, intentar con generación de contenido
        const contentResponse = await generateContent.execute(inputValue.trim(), 'general');
        
        if (contentResponse?.success && contentResponse.data) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: contentResponse.data.content,
            timestamp: new Date(),
            metadata: contentResponse.data.metadata,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error('No se pudo obtener respuesta');
        }
      }
    } catch (err) {
      error('Error al procesar mensaje', 'No se pudo obtener respuesta del asistente');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Lo siento, no pude procesar tu mensaje. Por favor, inténtalo de nuevo.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    success('Mensaje copiado', 'El mensaje se ha copiado al portapapeles');
  };

  const downloadConversation = () => {
    const conversation = messages
      .map(msg => `${msg.type === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversacion-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Conversación descargada', 'La conversación se ha descargado correctamente');
  };

  const clearConversation = () => {
    setMessages([]);
    success('Conversación limpiada', 'La conversación se ha limpiado');
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Asistente AI</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {module !== 'general' ? `Módulo: ${module}` : 'Asistente general'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadConversation}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConversation}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'assistant' && (
                  <Bot className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Fuentes:
                      </p>
                      {message.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {message.type === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-blue-500" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu mensaje..."
            disabled={isTyping}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-2 flex flex-wrap gap-1">
          {module === 'evaluation' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('Ayúdame a crear una evaluación')}
                className="text-xs"
              >
                Crear evaluación
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('Analiza los resultados de las evaluaciones')}
                className="text-xs"
              >
                Analizar resultados
              </Button>
            </>
          )}
          {module === 'attendance' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('Genera un reporte de asistencia')}
                className="text-xs"
              >
                Reporte asistencia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputValue('Analiza las tendencias de asistencia')}
                className="text-xs"
              >
                Analizar tendencias
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChatbot; 