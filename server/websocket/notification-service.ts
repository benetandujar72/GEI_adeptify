import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger.js';

export interface NotificationData {
  id: string;
  userId: string;
  instituteId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'evaluation' | 'attendance' | 'guard' | 'system' | 'academic';
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  isRead: boolean;
}

export class NotificationService {
  private io: SocketIOServer;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    logger.info('🔔 Servicio de notificaciones WebSocket iniciado');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 Cliente conectado: ${socket.id}`);

      // Autenticar usuario
      socket.on('authenticate', (data: { userId: string; instituteId: string }) => {
        this.userSockets.set(data.userId, socket.id);
        socket.join(`institute:${data.instituteId}`);
        socket.join(`user:${data.userId}`);
        
        logger.info(`✅ Usuario ${data.userId} autenticado en WebSocket`);
        socket.emit('authenticated', { success: true });
      });

      // Marcar notificación como leída
      socket.on('mark-read', async (data: { notificationId: string }) => {
        try {
          // Aquí implementaríamos la lógica para marcar como leída en BD
          logger.info(`📖 Notificación ${data.notificationId} marcada como leída`);
          socket.emit('notification-read', { success: true, notificationId: data.notificationId });
        } catch (error) {
          logger.error('Error marcando notificación como leída:', error);
          socket.emit('error', { message: 'Error al marcar notificación como leída' });
        }
      });

      // Suscribirse a categorías específicas
      socket.on('subscribe', (categories: string[]) => {
        categories.forEach(category => {
          socket.join(`category:${category}`);
        });
        logger.info(`📡 Usuario suscrito a categorías: ${categories.join(', ')}`);
      });

      // Desconexión
      socket.on('disconnect', () => {
        const userId = this.findUserIdBySocketId(socket.id);
        if (userId) {
          this.userSockets.delete(userId);
          logger.info(`🔌 Usuario ${userId} desconectado`);
        }
      });
    });
  }

  private findUserIdBySocketId(socketId: string): string | undefined {
    for (const [userId, sid] of this.userSockets.entries()) {
      if (sid === socketId) return userId;
    }
    return undefined;
  }

  // Enviar notificación a un usuario específico
  public sendToUser(userId: string, notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      const fullNotification: NotificationData = {
        ...notification,
        id: this.generateId(),
        createdAt: new Date(),
        isRead: false
      };

      this.io.to(socketId).emit('notification', fullNotification);
      logger.info(`📤 Notificación enviada a usuario ${userId}: ${notification.title}`);
    }
  }

  // Enviar notificación a todo un instituto
  public sendToInstitute(instituteId: string, notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
      isRead: false
    };

    this.io.to(`institute:${instituteId}`).emit('notification', fullNotification);
    logger.info(`📤 Notificación enviada a instituto ${instituteId}: ${notification.title}`);
  }

  // Enviar notificación por categoría
  public sendToCategory(category: string, notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
      isRead: false
    };

    this.io.to(`category:${category}`).emit('notification', fullNotification);
    logger.info(`📤 Notificación enviada a categoría ${category}: ${notification.title}`);
  }

  // Broadcast a todos los usuarios conectados
  public broadcast(notification: Omit<NotificationData, 'id' | 'createdAt' | 'isRead'>) {
    const fullNotification: NotificationData = {
      ...notification,
      id: this.generateId(),
      createdAt: new Date(),
      isRead: false
    };

    this.io.emit('notification', fullNotification);
    logger.info(`📤 Notificación broadcast: ${notification.title}`);
  }

  // Obtener estadísticas de conexiones
  public getStats() {
    return {
      totalConnections: this.io.engine.clientsCount,
      userConnections: this.userSockets.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys())
    };
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 