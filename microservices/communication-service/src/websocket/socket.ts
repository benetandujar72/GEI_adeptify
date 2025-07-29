import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { communicationService } from '../services/communication.service';

interface UserSocket {
  userId: number;
  socketId: string;
  rooms: string[];
}

interface MessageData {
  senderId: number;
  receiverId?: number;
  conversationId?: number;
  content: string;
  type?: string;
  metadata?: any;
}

interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: string;
  category: string;
  priority?: string;
  metadata?: any;
}

class WebSocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, UserSocket> = new Map();
  private userSockets: Map<number, string[]> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Autenticación del usuario
      socket.on('authenticate', async (data: { userId: number; token?: string }) => {
        try {
          // Aquí se validaría el token con el User Service
          const { userId } = data;
          
          // Registrar usuario conectado
          this.registerUser(userId, socket.id);
          
          // Unir al usuario a sus salas personalizadas
          await this.joinUserRooms(userId, socket);
          
          socket.emit('authenticated', { success: true, userId });
          logger.info(`User authenticated: ${userId} on socket ${socket.id}`);
        } catch (error) {
          logger.error('Authentication error:', error);
          socket.emit('authentication_error', { error: 'Authentication failed' });
        }
      });

      // Enviar mensaje directo
      socket.on('send_message', async (data: MessageData) => {
        try {
          const message = await communicationService.sendMessage({
            senderId: data.senderId,
            receiverId: data.receiverId!,
            content: data.content,
            type: data.type || 'text',
            metadata: data.metadata
          });

          // Enviar mensaje al destinatario si está conectado
          const receiverSockets = this.userSockets.get(data.receiverId!);
          if (receiverSockets) {
            receiverSockets.forEach(socketId => {
              this.io.to(socketId).emit('new_message', message);
            });
          }

          // Confirmar envío al remitente
          socket.emit('message_sent', { success: true, messageId: message.id });
          logger.info(`Message sent: ${message.id} from ${data.senderId} to ${data.receiverId}`);
        } catch (error) {
          logger.error('Error sending message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Enviar mensaje a conversación
      socket.on('send_conversation_message', async (data: MessageData) => {
        try {
          const message = await communicationService.sendConversationMessage({
            conversationId: data.conversationId!,
            senderId: data.senderId,
            content: data.content,
            type: data.type || 'text',
            metadata: data.metadata
          });

          // Enviar mensaje a todos los participantes de la conversación
          this.io.to(`conversation_${data.conversationId}`).emit('new_conversation_message', message);
          
          socket.emit('conversation_message_sent', { success: true, messageId: message.id });
          logger.info(`Conversation message sent: ${message.id} in conversation ${data.conversationId}`);
        } catch (error) {
          logger.error('Error sending conversation message:', error);
          socket.emit('message_error', { error: 'Failed to send conversation message' });
        }
      });

      // Unirse a conversación
      socket.on('join_conversation', async (data: { conversationId: number; userId: number }) => {
        try {
          const roomName = `conversation_${data.conversationId}`;
          socket.join(roomName);
          
          // Actualizar registro de salas del usuario
          const userSocket = this.connectedUsers.get(socket.id);
          if (userSocket && !userSocket.rooms.includes(roomName)) {
            userSocket.rooms.push(roomName);
          }
          
          socket.emit('joined_conversation', { 
            success: true, 
            conversationId: data.conversationId,
            room: roomName
          });
          
          // Notificar a otros participantes
          socket.to(roomName).emit('user_joined_conversation', {
            conversationId: data.conversationId,
            userId: data.userId
          });
          
          logger.info(`User ${data.userId} joined conversation ${data.conversationId}`);
        } catch (error) {
          logger.error('Error joining conversation:', error);
          socket.emit('join_error', { error: 'Failed to join conversation' });
        }
      });

      // Salir de conversación
      socket.on('leave_conversation', (data: { conversationId: number; userId: number }) => {
        try {
          const roomName = `conversation_${data.conversationId}`;
          socket.leave(roomName);
          
          // Actualizar registro de salas del usuario
          const userSocket = this.connectedUsers.get(socket.id);
          if (userSocket) {
            userSocket.rooms = userSocket.rooms.filter(room => room !== roomName);
          }
          
          socket.emit('left_conversation', { 
            success: true, 
            conversationId: data.conversationId 
          });
          
          // Notificar a otros participantes
          socket.to(roomName).emit('user_left_conversation', {
            conversationId: data.conversationId,
            userId: data.userId
          });
          
          logger.info(`User ${data.userId} left conversation ${data.conversationId}`);
        } catch (error) {
          logger.error('Error leaving conversation:', error);
          socket.emit('leave_error', { error: 'Failed to leave conversation' });
        }
      });

      // Marcar mensaje como leído
      socket.on('mark_message_read', async (data: { messageId: number }) => {
        try {
          const message = await communicationService.markMessageAsRead(data.messageId);
          socket.emit('message_marked_read', { success: true, messageId: data.messageId });
          logger.info(`Message marked as read: ${data.messageId}`);
        } catch (error) {
          logger.error('Error marking message as read:', error);
          socket.emit('mark_read_error', { error: 'Failed to mark message as read' });
        }
      });

      // Marcar notificación como leída
      socket.on('mark_notification_read', async (data: { notificationId: number }) => {
        try {
          const notification = await communicationService.markNotificationAsRead(data.notificationId);
          socket.emit('notification_marked_read', { 
            success: true, 
            notificationId: data.notificationId 
          });
          logger.info(`Notification marked as read: ${data.notificationId}`);
        } catch (error) {
          logger.error('Error marking notification as read:', error);
          socket.emit('mark_read_error', { error: 'Failed to mark notification as read' });
        }
      });

      // Solicitar notificaciones no leídas
      socket.on('get_unread_notifications', async (data: { userId: number }) => {
        try {
          const result = await communicationService.getUserNotifications(data.userId, {
            isRead: false,
            limit: 20
          });
          
          socket.emit('unread_notifications', {
            success: true,
            notifications: result.notifications,
            total: result.total
          });
        } catch (error) {
          logger.error('Error getting unread notifications:', error);
          socket.emit('notifications_error', { error: 'Failed to get notifications' });
        }
      });

      // Solicitar mensajes no leídos
      socket.on('get_unread_messages', async (data: { userId: number }) => {
        try {
          // Implementar lógica para obtener mensajes no leídos
          socket.emit('unread_messages', {
            success: true,
            messages: [],
            total: 0
          });
        } catch (error) {
          logger.error('Error getting unread messages:', error);
          socket.emit('messages_error', { error: 'Failed to get messages' });
        }
      });

      // Ping/Pong para mantener conexión
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Desconexión
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private registerUser(userId: number, socketId: string) {
    // Registrar socket del usuario
    this.connectedUsers.set(socketId, {
      userId,
      socketId,
      rooms: []
    });

    // Registrar usuario en el mapa de sockets por usuario
    const userSockets = this.userSockets.get(userId) || [];
    userSockets.push(socketId);
    this.userSockets.set(userId, userSockets);
  }

  private async joinUserRooms(userId: number, socket: Socket) {
    try {
      // Unir al usuario a su sala personal
      const userRoom = `user_${userId}`;
      socket.join(userRoom);
      
      // Obtener conversaciones del usuario y unirlo a ellas
      // Esto se implementaría consultando la base de datos
      
      logger.info(`User ${userId} joined personal room: ${userRoom}`);
    } catch (error) {
      logger.error('Error joining user rooms:', error);
    }
  }

  private handleDisconnect(socket: Socket) {
    const userSocket = this.connectedUsers.get(socket.id);
    if (userSocket) {
      const { userId, socketId } = userSocket;
      
      // Remover socket del registro
      this.connectedUsers.delete(socketId);
      
      // Remover socket del mapa de usuario
      const userSockets = this.userSockets.get(userId) || [];
      const updatedSockets = userSockets.filter(id => id !== socketId);
      
      if (updatedSockets.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, updatedSockets);
      }
      
      logger.info(`User ${userId} disconnected from socket ${socketId}`);
    }
  }

  // Métodos públicos para enviar notificaciones desde otros servicios

  /**
   * Enviar notificación a un usuario específico
   */
  public async sendNotificationToUser(notificationData: NotificationData) {
    try {
      const notification = await communicationService.createNotification(notificationData);
      
      // Enviar notificación a través de WebSocket si el usuario está conectado
      const userSockets = this.userSockets.get(notificationData.userId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.io.to(socketId).emit('new_notification', notification);
        });
      }
      
      logger.info(`Notification sent to user ${notificationData.userId}: ${notification.id}`);
      return notification;
    } catch (error) {
      logger.error('Error sending notification to user:', error);
      throw error;
    }
  }

  /**
   * Enviar notificaciones masivas
   */
  public async sendBulkNotifications(
    userIds: number[],
    notificationData: Omit<NotificationData, 'userId'>
  ) {
    try {
      const notifications = await communicationService.createBulkNotifications(userIds, notificationData);
      
      // Enviar notificaciones a usuarios conectados
      userIds.forEach(userId => {
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
          const notification = notifications.find(n => n.userId === userId);
          if (notification) {
            userSockets.forEach(socketId => {
              this.io.to(socketId).emit('new_notification', notification);
            });
          }
        }
      });
      
      logger.info(`Bulk notifications sent to ${userIds.length} users`);
      return notifications;
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje a conversación
   */
  public async sendMessageToConversation(
    conversationId: number,
    messageData: Omit<MessageData, 'receiverId'>
  ) {
    try {
      const message = await communicationService.sendConversationMessage({
        conversationId,
        senderId: messageData.senderId,
        content: messageData.content,
        type: messageData.type || 'text',
        metadata: messageData.metadata
      });
      
      // Enviar mensaje a todos los participantes de la conversación
      this.io.to(`conversation_${conversationId}`).emit('new_conversation_message', message);
      
      logger.info(`Message sent to conversation ${conversationId}: ${message.id}`);
      return message;
    } catch (error) {
      logger.error('Error sending message to conversation:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de conexiones
   */
  public getConnectionStats() {
    return {
      totalConnections: this.connectedUsers.size,
      totalUsers: this.userSockets.size,
      connectedUsers: Array.from(this.userSockets.keys())
    };
  }
}

let wsManager: WebSocketManager;

export function setupWebSocket(io: SocketIOServer) {
  wsManager = new WebSocketManager(io);
  logger.info('WebSocket manager initialized');
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return wsManager;
}