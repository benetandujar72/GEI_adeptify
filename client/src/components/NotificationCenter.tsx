import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'evaluation' | 'attendance' | 'guard' | 'system' | 'academic';
  actionUrl?: string;
  createdAt: Date;
  isRead: boolean;
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Conectar WebSocket
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        console.log('🔌 WebSocket conectado');
        
        // Autenticar usuario
        socketRef.current?.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id,
          instituteId: user.instituteId
        }));

        // Suscribirse a categorías
        socketRef.current?.send(JSON.stringify({
          type: 'subscribe',
          categories: ['evaluation', 'attendance', 'guard', 'system', 'academic']
        }));
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notification') {
          const newNotification: Notification = {
            ...data,
            createdAt: new Date(data.createdAt)
          };
          
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast
          addToast({
            title: newNotification.title,
            description: newNotification.message,
            type: newNotification.type
          });
        }
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        console.log('🔌 WebSocket desconectado');
        
        // Reintentar conexión después de 5 segundos
        setTimeout(connectWebSocket, 5000);
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    // Limpiar al desmontar
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user, addToast]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Enviar al servidor
    socketRef.current?.send(JSON.stringify({
      type: 'mark-read',
      notificationId
    }));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        {!isConnected && (
          <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
        )}
      </Button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Marcar todas como leídas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.category}
                        </Badge>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Leída
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 